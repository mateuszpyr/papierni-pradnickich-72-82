#!/bin/bash
# Przejdź do katalogu projektu
cd /home/debian/wspolnota/papierni-pradnickich-72-82

# Pobierz najnowsze informacje z repozytorium
git fetch

# Sprawdź, czy lokalny main różni się od origin/main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u})

if [ $LOCAL != $REMOTE ]; then
    echo "Wykryto zmiany na GitHubie! Aktualizuję..."
    git pull
    # Jeśli używasz Opcji 1 (z volumes), to linijka poniżej jest opcjonalna, 
    # ale warto ją mieć na wypadek zmiany konfiguracji samego Nginxa:
    docker compose up -d --build
fi
