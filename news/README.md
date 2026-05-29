# Jak dodać nowe ogłoszenie / How to add a new announcement

Każde ogłoszenie to **jeden plik Markdown** w folderze [`items/`](items/), z metadanymi w nagłówku (YAML frontmatter) i treścią w dwóch sekcjach językowych. Dodatkowo trzeba dopisać nazwę pliku do [`items/index.json`](items/index.json) — to lista plików do wczytania (statyczne hostowanie nie potrafi listować katalogu).

## Po polsku

### Krok po kroku (przez przeglądarkę GitHub)

1. Wejdź w folder [`items/`](items/).
2. Kliknij **Add file → Create new file**.
3. Nazwij plik wg schematu `RRRR-MM-DD-slug.md`, np. `2026-06-15-zebranie-czerwiec.md`. `slug` to krótki identyfikator (bez polskich znaków, małe litery, myślniki).
4. Wklej szablon:

```markdown
---
slug: 'zebranie-czerwiec'
date: '2026-06-15'
tag_slug: 'ogloszenie'
tag_pl: 'Ogłoszenie'
tag_en: 'Notice'
author: 'Imię Nazwisko'
read_min: 2
image: ''
title_pl: 'Tytuł po polsku'
title_en: 'Title in English'
lead_pl: 'Jedno-dwa zdania zajawki po polsku.'
lead_en: 'One or two sentences of teaser in English.'
link_url: ''
link_label_pl: ''
link_label_en: ''
messenger_link: ''
---

::: pl

Pierwszy akapit po polsku. Możesz używać **pogrubienia** i [linków](https://example.com).

Drugi akapit. Listy:

- punkt jeden
- punkt dwa
:::

::: en

First paragraph in English. You can use **bold** and [links](https://example.com).

Second paragraph. Lists:

- item one
- item two
:::
```

5. Otwórz [`items/index.json`](items/index.json) i dopisz nazwę nowego pliku **na początku listy** (najnowsze na górze).

6. Commit changes — strona pokaże ogłoszenie po kilku sekundach.

### Pola we frontmatterze

- **slug** — krótki identyfikator (taki sam jak w nazwie pliku, bez daty)
- **date** — `RRRR-MM-DD`
- **tag_slug** — kolor etykiety. Predefiniowane: `energia-bierna` (pomarańcz), `reprezentacja` (czerwony), `podsumowanie` (niebieski), `kompensator` (zielony), `zmiana-zarzadcy` (fiolet), `ogloszenie`, `wydarzenie`. Cokolwiek innego dostanie kolor domyślny
- **tag_pl / tag_en** — etykieta widoczna na karcie
- **author** — opcjonalnie
- **read_min** — szacowany czas czytania (liczba bez cudzysłowów)
- **image** — opcjonalna ścieżka, np. `'assets/img/news/spotkanie.jpg'`
- **title_pl / title_en** — tytuł
- **lead_pl / lead_en** — zajawka pokazywana na liście. Jeśli pusta, system weźmie pierwszy akapit body
- **link_url / link_label_pl / link_label_en** — opcjonalny link zewnętrzny
- **messenger_link** — opcjonalny link do wątku na Messengerze

### Składnia tekstu (Markdown)

Renderer obsługuje:

- akapity (oddzielone pustą linią)
- listy (`- punkt`)
- **pogrubienie** (`**tekst**`)
- [linki](url) (`[etykieta](https://...)`)

### Uwagi

- Wartości tekstowe wrap-uj w `'pojedyncze cudzysłowy'`. Apostrof wewnątrz podwajasz: `'don''t'`.
- Sekcje `::: pl` i `::: en` muszą się kończyć linią z samym `:::`.
- Pola opcjonalne możesz zostawić jako puste stringi `''`.

---

## In English

Each announcement is **one Markdown file** in [`items/`](items/) with YAML frontmatter metadata and two language body sections. Also add the filename to [`items/index.json`](items/index.json) — the loader needs it (static hosting can't list directories).

### Step by step

1. Go to [`items/`](items/), click **Add file → Create new file**.
2. Name it `YYYY-MM-DD-slug.md`.
3. Paste the Polish template above and translate.
4. Add the filename to the top of [`items/index.json`](items/index.json).
5. Commit changes.

The frontmatter fields are documented in the Polish section above.
