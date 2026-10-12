# Editorial pages

`editorial.mjs` renders the History home page, history, estate map, inside, life, watch and contribution pages through the existing `archive.mjs` shell. Theme additions live in `editorial.css`; `archive.css` is unchanged.

Build: `node build.mjs`. Check: `node tests/editorial.mjs`. Neither command fetches agency listings or publishes.

- `films.json`: six selected YouTube films, category, related route and running time. IDs and publisher names were checked against YouTube oEmbed on 12 October 2026; durations came from player metadata. Videos load on click, with an original YouTube link always available. Availability can change.
- `inside.json`: five short, independently worded guides based on the retained flat-type research. Other types link out to Barbican Living. No plans or source layout paragraphs are reproduced. Verify research before adding more guides: some raw bedroom fields contradict their descriptions.
- `life.json`: editorial introductions to existing films. These are not submitted resident stories or newly conducted interviews.
- `community.json`: reviewed contributions only. Keep raw submissions, correspondence, emails and consent evidence outside this public repository. A published item needs `slug`, `title`, `display_name`, `body` (paragraph array), `blocks` (array), `status: "published"`, `permission_confirmed: true`, and `reviewed_on` (date). Record actual permission privately before setting those fields. A draft is not rendered. Never add private flat numbers or contact details.
- `contribute.json`: set `email` to the chosen public editorial inbox. Until then the form previews/downloads a text draft and explicitly says submissions are not open. Once configured, it also opens an email draft for the contributor to send. It does not upload files, send email itself, or publish submissions. Photographs can be attached in the contributor's email client. New photo publication requires a reviewed image asset and a credit entry; there is deliberately no automatic photo upload.

Film discovery sources:

- https://architecturefoundation.org.uk/programme/2015/the-barbican-londons-middle-class-council-estate
- https://www.barbican.org.uk/read-watch-listen/the-barbican-mixtape-a-history-of-the-barbican-estate
- https://www.youtube.com/watch?v=vvXpvH99tic (BBC Archive)
- https://themodernhouse.com/journal/barbican-flat-tom-morris-living-with-colour
- https://www.bekalemoine.com/barbicania.php
- https://www.youtube.com/watch?v=frrDUUOQ4EY (Amy Bass)

Older Barbicania Vimeo clips could not be verified as playable, so the collection uses the filmmakers' YouTube trailer instead. Existing photo credits are collected through the archive's Commons helper. Video posters come directly from YouTube; player frames are loaded only after a click.
