import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from app import create_app


class LocateUApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database = str(Path(self.temp_dir.name) / "locateu.sqlite3")
        self.app = create_app({
            "TESTING": True,
            "WTF_CSRF_ENABLED": False,
            "SECRET_KEY": "test-secret-key",
            "DATABASE_PATH": self.database,
            "RATELIMIT_ENABLED": False,
        })
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def register(self, username="traveler", email="traveler@example.com"):
        return self.client.post("/register", data={
            "username": username,
            "email": email,
            "password": "long-test-password",
        }, follow_redirects=False)

    def test_registration_login_and_logout(self):
        response = self.register()
        self.assertEqual(response.status_code, 302)
        self.assertIn(b"traveler", self.client.get("/profile").data)
        self.client.post("/logout")
        response = self.client.post("/login", data={"identity": "traveler@example.com", "password": "long-test-password"})
        self.assertEqual(response.status_code, 302)
        self.client.post("/logout")
        response = self.client.post("/login", data={"identity": "traveler", "password": "wrong-password"})
        self.assertEqual(response.status_code, 401)

    def test_registration_rejects_short_password(self):
        response = self.client.post("/register", data={"username": "short", "email": "short@example.com", "password": "short"})
        self.assertEqual(response.status_code, 400)

    def test_favorites_require_auth_and_can_be_added_removed(self):
        self.assertEqual(self.client.post("/api/favorites/1").status_code, 401)
        self.register()
        added = self.client.post("/api/favorites/1")
        self.assertEqual(added.status_code, 200)
        self.assertTrue(added.get_json()["saved"])
        removed = self.client.delete("/api/favorites/1")
        self.assertEqual(removed.status_code, 200)
        self.assertFalse(removed.get_json()["saved"])
        self.assertEqual(self.client.post("/api/favorites/999").status_code, 404)

    def test_search_recommendations_and_validation(self):
        results = self.client.get("/api/search?q=Araku&sort=recommended")
        self.assertEqual(results.status_code, 200)
        payload = results.get_json()
        self.assertGreaterEqual(payload["count"], 1)
        self.assertIn("recommendation_score", payload["places"][0])
        self.assertIn("available rating", payload["score_note"])
        invalid = self.client.get("/api/search?lat=500&lng=0")
        self.assertEqual(invalid.status_code, 400)
        invalid_sort = self.client.get("/api/search?sort=popular")
        self.assertEqual(invalid_sort.status_code, 400)

    def test_feature_discovery_pages_and_category_search(self):
        self.assertEqual(self.client.get("/accommodations").status_code, 200)
        self.assertEqual(self.client.get("/food").status_code, 200)
        self.assertEqual(self.client.get("/transport").status_code, 200)

        hotel_results = self.client.get("/api/search?category=hotel&q=Vizag")
        self.assertEqual(hotel_results.status_code, 200)
        self.assertGreaterEqual(hotel_results.get_json()["count"], 1)

        restaurant_results = self.client.get("/api/search?category=restaurant&q=Hyderabad")
        self.assertEqual(restaurant_results.status_code, 200)
        self.assertGreaterEqual(restaurant_results.get_json()["count"], 1)

    def test_itinerary_crud_and_ownership(self):
        self.register()
        created = self.client.post("/api/itineraries", json={"title": "Coastal weekend", "destination": "Andhra Pradesh"})
        self.assertEqual(created.status_code, 201)
        itinerary_id = created.get_json()["id"]
        item = self.client.post(f"/api/itineraries/{itinerary_id}/items", json={"place_id": 1, "day_number": 2, "notes": "Start early"})
        self.assertEqual(item.status_code, 201)
        listed = self.client.get("/api/itineraries").get_json()["itineraries"][0]
        self.assertEqual(listed["items"][0]["day_number"], 2)
        updated = self.client.patch(f"/api/itineraries/{itinerary_id}", json={"title": "Long weekend"})
        self.assertTrue(updated.get_json()["updated"])
        removed = self.client.delete(f"/api/itineraries/{itinerary_id}/items/{item.get_json()['id']}")
        self.assertTrue(removed.get_json()["deleted"])
        deleted = self.client.delete(f"/api/itineraries/{itinerary_id}")
        self.assertTrue(deleted.get_json()["deleted"])
        self.assertEqual(self.client.delete(f"/api/itineraries/{itinerary_id}").status_code, 404)

    def test_geocoding_and_nearby_errors_are_graceful(self):
        invalid = self.client.post("/api/places/nearby", json={"lat": "bad", "lng": 2})
        self.assertEqual(invalid.status_code, 400)
        with patch.dict(os.environ, {"GOOGLE_MAPS_SERVER_KEY": ""}):
            no_key = self.client.post("/api/geocode", json={"address": "Araku Valley"})
        self.assertEqual(no_key.status_code, 400)
        self.assertIn("not configured", no_key.get_json()["error"])

    def test_public_services_nearby_uses_google_place_types(self):
        google_response = Mock()
        google_response.json.return_value = {"places": []}
        with patch.dict(os.environ, {"GOOGLE_MAPS_SERVER_KEY": "test-server-key"}), patch(
            "services.requests.post", return_value=google_response
        ) as nearby_request:
            response = self.client.post("/api/places/nearby", json={
                "lat": 17.7,
                "lng": 83.3,
                "category": "public_services",
            })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            nearby_request.call_args.kwargs["json"]["includedTypes"],
            ["public_bathroom", "atm", "police", "gas_station", "parking", "drinking_water"],
        )

    def test_nearby_results_preserve_provider_place_details(self):
        google_response = Mock()
        google_response.json.return_value = {"places": [{
            "id": "google-place-id",
            "displayName": {"text": "Example Cafe"},
            "formattedAddress": "1 Example Street, Tokyo, Japan",
            "location": {"latitude": 35.6, "longitude": 139.7},
            "rating": 4.5,
            "userRatingCount": 28,
            "primaryType": "cafe",
            "websiteUri": "https://example.test/",
            "nationalPhoneNumber": "+81 00 0000 0000",
            "regularOpeningHours": {"weekdayDescriptions": ["Monday: 9:00 AM - 5:00 PM"]},
        }]}
        with patch.dict(os.environ, {"GOOGLE_MAPS_SERVER_KEY": "test-server-key"}), patch(
            "services.requests.post", return_value=google_response
        ):
            response = self.client.post("/api/places/nearby", json={
                "lat": 35.6,
                "lng": 139.7,
                "category": "restaurant",
            })

        self.assertEqual(response.status_code, 200)
        place = response.get_json()["places"][0]
        self.assertEqual(place["name"], "Example Cafe")
        self.assertEqual(place["rating"], 4.5)
        self.assertEqual(place["phone"], "+81 00 0000 0000")
        self.assertEqual(place["website"], "https://example.test/")
        self.assertEqual(place["opening_hours"], "Monday: 9:00 AM - 5:00 PM")

    def test_nearby_search_does_not_substitute_unrelated_curated_places(self):
        with patch.dict(os.environ, {"GOOGLE_MAPS_SERVER_KEY": ""}):
            response = self.client.post("/api/places/nearby", json={
                "lat": 35.6,
                "lng": 139.7,
                "category": "hotel",
            })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["places"], [])
        self.assertIn("not configured", response.get_json()["warning"])

    def test_global_geocoding_accepts_international_addresses(self):
        google_response = Mock()
        google_response.json.return_value = {
            "status": "OK",
            "results": [{
                "formatted_address": "Shibuya City, Tokyo, Japan",
                "geometry": {"location": {"lat": 35.6595, "lng": 139.7005}},
                "address_components": [
                    {"long_name": "Shibuya City", "types": ["locality", "political"]},
                    {"long_name": "Tokyo", "types": ["administrative_area_level_1", "political"]},
                    {"long_name": "Japan", "types": ["country", "political"]},
                ],
            }],
        }
        with patch.dict(os.environ, {"GOOGLE_MAPS_SERVER_KEY": "test-server-key"}), patch(
            "services.requests.get", return_value=google_response
        ) as geocode_request:
            response = self.client.post("/api/geocode", json={"address": "Shibuya, Tokyo, Japan"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["latitude"], 35.6595)
        self.assertEqual(response.get_json()["address_components"][0]["long_name"], "Shibuya City")
        self.assertEqual(geocode_request.call_args.kwargs["params"]["address"], "Shibuya, Tokyo, Japan")
        self.assertNotIn("region", geocode_request.call_args.kwargs["params"])

    def test_reverse_geocoding_resolves_map_coordinates(self):
        google_response = Mock()
        google_response.json.return_value = {
            "status": "OK",
            "results": [{
                "formatted_address": "Shibuya City, Tokyo, Japan",
                "address_components": [{"long_name": "Japan", "types": ["country", "political"]}],
            }],
        }
        with patch.dict(os.environ, {"GOOGLE_MAPS_SERVER_KEY": "test-server-key"}), patch(
            "services.requests.get", return_value=google_response
        ) as geocode_request:
            response = self.client.post("/api/reverse-geocode", json={"lat": 35.6595, "lng": 139.7005})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["address"], "Shibuya City, Tokyo, Japan")
        self.assertEqual(response.get_json()["address_components"][0]["long_name"], "Japan")
        self.assertEqual(geocode_request.call_args.kwargs["params"]["latlng"], "35.6595,139.7005")

    def test_maps_configuration_exposes_only_browser_key(self):
        with patch.dict(os.environ, {
            "GOOGLE_MAPS_BROWSER_KEY": "browser-key-for-test",
            "GOOGLE_MAPS_SERVER_KEY": "server-secret-for-test",
        }):
            maps_app = create_app({
                "TESTING": True,
                "WTF_CSRF_ENABLED": False,
                "SECRET_KEY": "test-secret-key",
                "DATABASE_PATH": self.database,
                "RATELIMIT_ENABLED": False,
            })

        response = maps_app.test_client().get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"browser-key-for-test", response.data)
        self.assertIn(b'id="google-maps-api"', response.data)
        self.assertIn(b"callback=initLocateUMap", response.data)
        self.assertNotIn(b"server-secret-for-test", response.data)

    def test_home_explains_missing_maps_key(self):
        maps_app = create_app({
            "TESTING": True,
            "WTF_CSRF_ENABLED": False,
            "SECRET_KEY": "test-secret-key",
            "DATABASE_PATH": self.database,
            "GOOGLE_MAPS_BROWSER_KEY": "",
            "RATELIMIT_ENABLED": False,
        })
        response = maps_app.test_client().get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"GOOGLE_MAPS_BROWSER_KEY", response.data)
        self.assertNotIn(b"maps.googleapis.com/maps/api/js", response.data)

    def test_home_has_dynamic_destination_and_separate_current_location_panels(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'id="destination-city"', response.data)
        self.assertIn(b'id="destination-country"', response.data)
        self.assertIn(b'id="destination-coordinates"', response.data)
        self.assertIn(b'id="selected-place-summary"', response.data)
        self.assertIn(b'id="current-location-summary"', response.data)
        self.assertIn(b'id="route-selected-destination"', response.data)


if __name__ == "__main__":
    unittest.main()
