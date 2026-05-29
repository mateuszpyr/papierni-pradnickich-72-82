# Wspólnota Mieszkaniowa Papierni Prądnickich 72–82

Statyczna strona informacyjna wspólnoty — Kraków, Prądnik Biały.

## Funkcje

- 🌗 Tryb jasny / ciemny (z zapamiętaniem wyboru)
- 🇵🇱 / 🇬🇧 Dwa języki (PL / EN)
- 📰 Sekcja aktualności (dodawana przez edycję jednego pliku JSON)
- 📷 Galeria zdjęć z lightboxem
- 📒 Niezbędnik mieszkańca (telefony alarmowe, kontakt do zarządu, FAQ)
- 💬 Linki do grup Facebook i Messenger
- 🎬 Wideo w tle sekcji hero

## Stack

Czysty HTML + CSS + vanilla JS. Bez backendu, bez frameworków, bez budowania.

## Rozwój lokalny

Wystarczy uruchomić dowolny statyczny serwer w katalogu projektu, np.:

```powershell
# Python
python -m http.server 8080

# Node (npx)
npx serve .
```

I otworzyć `http://localhost:8080`.

## Deployment

Push do `main` → GitHub Action automatycznie publikuje stronę na GitHub Pages
(workflow w `.github/workflows/pages.yml`).

W ustawieniach repo: **Settings → Pages → Source: GitHub Actions**.

## Jak dodać ogłoszenie

Zobacz [`news/README.md`](news/README.md) — instrukcja krok po kroku dla osoby nietechnicznej.

## Jak dodać album zdjęć

Zobacz [`assets/gallery/README.md`](assets/gallery/README.md).

## Linki do uzupełnienia

W [`index.html`](index.html) wstaw rzeczywiste URL-e do:

- Grupy na Facebooku — `<a id="linkFacebook" href="...">`
- Grupy na Messengerze — `<a id="linkMessenger" href="...">`

W [`handbook.html`](handbook.html) — telefon do pogotowia konserwacyjnego oraz dane zarządcy.

## Struktura

```
.
├── index.html              strona główna
├── handbook.html           niezbędnik mieszkańca
├── gallery.html            galeria
├── i18n/                   tłumaczenia PL / EN
├── news/                   ogłoszenia (news.json)
├── assets/
│   ├── video/              wideo hero
│   ├── gallery/            albumy zdjęć
│   └── img/                grafiki
├── site/
│   ├── css/styles.css      style
│   └── js/                 logika (theme, i18n, news, gallery, hero)
└── .github/workflows/      deploy
```
