import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from database import STARTER_PLACES, get_db, init_db


class DatabaseInitializationTests(unittest.TestCase):
    def test_schema_and_starter_places_initialize(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "test.sqlite3"
            init_db(path)
            with closing(get_db(path)) as connection:
                tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                self.assertTrue({"users", "places", "favorites", "search_history", "itineraries", "itinerary_items", "user_preferences"}.issubset(tables))
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM places").fetchone()[0], len(STARTER_PLACES))
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM places WHERE verified = 0").fetchone()[0], len(STARTER_PLACES))

    def test_foreign_keys_are_enforced(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "test.sqlite3"
            init_db(path)
            with closing(get_db(path)) as connection:
                with self.assertRaises(sqlite3.IntegrityError):
                    connection.execute("INSERT INTO favorites (user_id, place_id) VALUES (10, 10)")


if __name__ == "__main__":
    unittest.main()
