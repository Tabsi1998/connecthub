# ConnectHub - Vereins- & Teamplattform

## Übersicht

ConnectHub ist eine zentrale Plattform für Vereine und Teams zur internen Organisation. Die App ersetzt das Chaos aus WhatsApp, E-Mails und Excel-Listen durch eine einheitliche Lösung.

## Implementierte Features (MVP)

### 1. Authentifizierung
- [x] E-Mail/Passwort Registrierung
- [x] E-Mail/Passwort Anmeldung
- [x] JWT-basierte Session-Verwaltung
- [x] Automatische Token-Speicherung

### 2. Dashboard
- [x] Willkommens-Begrüßung mit Benutzername
- [x] Rollen-Badge (Admin, Trainer, Mitglied, Gast)
- [x] Statistik-Übersicht (Mitglieder, Gruppen, Termine)
- [x] Nächste Termine Vorschau
- [x] Neueste Benachrichtigungen
- [x] Schnellaktionen für Admins/Trainer

### 3. Mitglieder- & Rollenverwaltung
- [x] Mitgliederliste mit Profilen
- [x] Rollen: Admin, Trainer, Mitglied, Gast
- [x] Rollenzuweisung durch Admins
- [x] Profil bearbeiten (Name, Telefon, Funktion)

### 4. Gruppen & Channels
- [x] Gruppen erstellen (Admin/Trainer)
- [x] Gruppen-Typen: Vorstand, Mitglieder, Team, Projekt, Events, Allgemein
- [x] Mitglieder zu Gruppen hinzufügen/entfernen
- [x] Chat-Funktion in Gruppen
- [x] Nachrichten mit Zeitstempel

### 5. Termine & Events
- [x] Termine erstellen mit Datum, Zeit, Ort
- [x] Maximale Teilnehmerzahl
- [x] Zusagen/Absagen
- [x] Teilnehmer-Übersicht
- [x] Kalender-Ansicht aller Termine

### 6. Benachrichtigungen (In-App)
- [x] Benachrichtigung bei neuen Nachrichten
- [x] Benachrichtigung bei neuen Terminen
- [x] Benachrichtigung bei Gruppenzuweisung
- [x] Alle als gelesen markieren
- [x] Ungelesene Anzahl als Badge

### 7. Dokumente
- [x] Dokumente hochladen (Base64)
- [x] Dokumentenliste
- [x] Dokumente löschen (Admin/Trainer)

## Technischer Stack

### Frontend
- **Framework:** Expo (React Native)
- **Navigation:** expo-router (File-based routing)
- **State Management:** React Context + AsyncStorage
- **UI Components:** React Native core + Expo Vector Icons
- **HTTP Client:** Axios
- **Datum/Zeit:** date-fns

### Backend
- **Framework:** FastAPI (Python)
- **Datenbank:** MongoDB
- **Auth:** JWT (python-jose)
- **Passwort-Hashing:** bcrypt

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrierung
- `POST /api/auth/login` - Anmeldung
- `GET /api/auth/me` - Aktueller Benutzer

### Users
- `GET /api/users` - Alle Benutzer
- `GET /api/users/{id}` - Benutzer Details
- `PUT /api/users/{id}` - Benutzer aktualisieren
- `PUT /api/users/{id}/role` - Rolle ändern (Admin)

### Groups
- `GET /api/groups` - Alle Gruppen
- `POST /api/groups` - Gruppe erstellen
- `GET /api/groups/{id}` - Gruppen-Details
- `PUT /api/groups/{id}` - Gruppe aktualisieren
- `DELETE /api/groups/{id}` - Gruppe löschen
- `POST /api/groups/{id}/members/{uid}` - Mitglied hinzufügen
- `DELETE /api/groups/{id}/members/{uid}` - Mitglied entfernen

### Messages
- `GET /api/groups/{id}/messages` - Nachrichten abrufen
- `POST /api/groups/{id}/messages` - Nachricht senden

### Events
- `GET /api/events` - Alle Termine
- `GET /api/events/upcoming` - Nächste Termine
- `POST /api/events` - Termin erstellen
- `GET /api/events/{id}` - Termin-Details
- `PUT /api/events/{id}` - Termin aktualisieren
- `DELETE /api/events/{id}` - Termin löschen
- `POST /api/events/{id}/attend` - Zusagen
- `POST /api/events/{id}/decline` - Absagen

### Notifications
- `GET /api/notifications` - Alle Benachrichtigungen
- `GET /api/notifications/unread/count` - Ungelesene Anzahl
- `PUT /api/notifications/{id}/read` - Als gelesen markieren
- `PUT /api/notifications/read-all` - Alle als gelesen

### Documents
- `GET /api/documents` - Alle Dokumente
- `POST /api/documents` - Dokument hochladen
- `GET /api/documents/{id}` - Dokument Details
- `DELETE /api/documents/{id}` - Dokument löschen

### Dashboard
- `GET /api/dashboard` - Dashboard-Daten

## Benutzerrollen

| Rolle | Gruppen erstellen | Termine erstellen | Rollen ändern | Mitglieder verwalten |
|-------|-------------------|-------------------|---------------|---------------------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Trainer | ✅ | ✅ | ❌ | ✅ |
| Mitglied | ❌ | ❌ | ❌ | ❌ |
| Gast | ❌ | ❌ | ❌ | ❌ |

## Geplante Erweiterungen

- [ ] Push-Benachrichtigungen
- [ ] Umfragen & Abstimmungen
- [ ] Medienbereich (Foto-Uploads)
- [ ] Fahrgemeinschaften
- [ ] Kalender-Export (ICS)
- [ ] DSGVO-Zustimmung
- [ ] Offline-Modus
