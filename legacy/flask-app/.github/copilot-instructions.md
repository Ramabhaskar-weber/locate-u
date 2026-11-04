# Locate U workspace notes

- Keep the Flask app modular: routes live in blueprints and reusable query/provider logic belongs in `services.py` or `database.py`.
- Use parameterized SQL, explicit ownership checks for user data, Flask-WTF CSRF on state-changing requests, and environment variables for secrets.
- Keep provider-supplied versus curated data distinguishable; never invent ratings, opening hours, reservations, transit schedules or availability.
- Google API keys must stay restricted and the server key must never be rendered to the browser.
- Run `python -m unittest discover -s tests -v` after backend changes and `node --check` on changed browser scripts.
