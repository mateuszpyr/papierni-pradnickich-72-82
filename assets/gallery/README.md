# Jak dodać album zdjęć / How to add a photo album

## Po polsku

1. Stwórz nowy folder w `assets/gallery/`, np. `assets/gallery/2026-majowka/`.
2. Wrzuć tam zdjęcia (najlepiej skompresowane do max ~500 KB każde, format `.jpg` lub `.webp`).
3. Edytuj plik [`gallery.json`](gallery.json) i dodaj nowy album do tablicy `albums`:

```json
{
  "albums": [
    {
      "folder": "2026-majowka",
      "date": "2026-05-01",
      "title_pl": "Majówka 2026",
      "title_en": "May picnic 2026",
      "description_pl": "Spotkanie integracyjne mieszkańców na trawniku przy budynku 76.",
      "description_en": "Resident gathering on the lawn by building 76.",
      "images": [
        { "file": "01.jpg", "caption_pl": "Grill", "caption_en": "BBQ" },
        { "file": "02.jpg", "caption_pl": "Dzieci na trawniku", "caption_en": "Kids on the lawn" }
      ]
    }
  ]
}
```

4. Commit i strona zaktualizuje się automatycznie.

## In English

Same as above — create a folder under `assets/gallery/`, drop in your photos, then add an album entry to `gallery.json`.
