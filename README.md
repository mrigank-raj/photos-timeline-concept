# Photos timeline concept

A concept for a photos timeline that understands who is in your photos, where and when, so you can find a moment without searching. Live: https://photos-timeline-concept.vercel.app

- **Moments:** flick fast and the grid becomes moments; tap one to jump in. The info button shows what the app noticed (people, place, scene).
- **Faces on the scroll bar:** tap a face and tick marks show where that person appears.
- **Same people, other times:** open a photo to see similar moments side by side, and correct a wrong face with "Not this person".
- **Try a task:** find a photo from a rough memory.

Everything runs on a fake, deterministic library of about 2,500 illustrated photos. Static site: plain HTML, CSS and JavaScript modules, no build step, no backend, nothing logged or sent anywhere.

Run locally: `python -m http.server 8000` in this folder, then open `http://localhost:8000/`.

This folder is generated from the main project (`MVP/app/`); edit there and run `python qa/build_deploy.py`.
