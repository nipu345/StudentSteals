# StudentSteals

March 2026 · Built at HackCU 12

React · Python · Flask · Google Gemini API · Google Places API · Leaflet

An AI-powered student finance app my team and I built at HackCU 12. StudentSteals helps college students stretch their money in two ways: it finds deals at the cafés, restaurants, grocery stores, bookstores, gyms and theaters around you and shows them on a live map, and it gives you an AI coach that looks at your spending and gives advice made for a student's budget. Set your monthly budget, add your purchases, and the app tells you where your money is going and where you can save.

## What you get

- **Nearby deals on a live map.** StudentSteals uses your location to find up to 30 student-friendly places within about a mile, across eight kinds of places: restaurants, cafés, bakeries, takeout, grocery stores, bookstores, gyms and movie theaters. Gemini writes a money-saving tip for each one with an estimate of how much you could save. You can filter the deals by category and see them all pinned on a map. Your location dot updates as you move, and tapping a deal flies the map to it.
- **An AI money coach that knows your month.** Ask anything, from "how do I eat for under $50 this week?" to "where is my money going?". Before it answers, the coach sees your budget for each category, what you've spent, your biggest merchants and the places near you, and it remembers the rest of the conversation. When it suggests food, it gives you two options: a cheap recipe to make at home and an affordable place nearby.
- **A budget that keeps up with you.** Set a monthly limit for each category, such as Food, Subscriptions and Transport. Add purchases as you go and watch each category fill up against its limit, with a warning when you go over. Every purchase shows up in a list, where you can delete it.
- **A spending report in plain English.** With one tap, Gemini reviews your budget against what you've actually spent. It names the categories where you're overspending, points out purchases that add up, uses real dollar amounts, and gives one or two specific things to change.
- **A demo month to try it out.** The app doesn't connect to a bank. Instead, one tap loads a sample month of student purchases and sorts each one into your categories, so you can try the budget, coach and report without typing in purchases.

## How to use it

1. **Enter your name and set your budget.** Adjust the starting categories or add your own, with a monthly limit for each.
2. **Add your purchases.** Enter them one at a time, or tap **Load Demo Month** for sample data.
3. **Open Steals.** Allow location access, and StudentSteals finds deals around you. Tap any deal to jump to it on the map.
4. **Ask the coach.** Use the Coach tab to get advice based on your own spending and the places near you.
5. **Get your report.** On the Budget tab, ask for an AI spending report to see how the month is going.

## How it's built

| Piece | Built with |
|---|---|
| App | React, with Leaflet and OpenStreetMap tiles for the live map |
| Server | Python and Flask, with three endpoints: `/deals`, `/coach` and `/insights` |
| Finding places | Google Places API (New), Nearby Search |
| Deal tips, coaching and spending reports | Google Gemini (`gemini-3.8-flash`) |

A Places search returns at most 20 results, so for each deals request the server searches all eight place types in parallel, removes duplicates and keeps the 30 nearest. Gemini then writes the tips in parallel batches of 10 rather than one call per place. Results are cached for 10 minutes so refreshing the same spot is instant.

<details>
<summary><strong>Running StudentSteals yourself</strong></summary>

You'll need a Google Cloud API key with **Places API (New)** enabled, and a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Create `StudentStealsProject/.env` containing:

```
GOOGLE_API_KEY=your-places-key
GEMINI_API_KEY=your-gemini-key
```

`.env` is listed in `.gitignore`, so your keys stay out of git.

**Server** (runs on port 8080)

```bash
cd StudentStealsProject
pip install -r requirements.txt
python app.py
```

**App** (runs on port 3000)

```bash
cd StudentStealsProject/frontend
npm install
npm start
```

</details>
