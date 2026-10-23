# Screen recording script (target 4 min, hard limit 5)

Setup before recording: two browser windows side by side (normal + incognito), Bubble app open on the login page in both, n8n workflow open in a third tab, NotificationLog empty or with a couple of old rows. Zoom browser to 110%.

| Time | Screen | Say (roughly) |
|---|---|---|
| 0:00–0:20 | Login page | "This is the BookLeaf royalty dashboard, built in Bubble with an n8n workflow that writes royalty summary emails with AI (Groq, with Gemini as backup). Everything runs on free tiers. I'll show the author side, the admin side, the automation, and the error handling." |
| 0:20–1:00 | Log in as **Priya** | "Priya sees only her two books — ISBN, genre, status, platforms, MRP, and per-book royalty: sold, earned, paid, pending, last payout. Totals on top. The Saffron Diaries is fully paid, so green; Whispers of the Ganges has ₹3,570 pending and the last payout was over 90 days ago, so red." |
| 1:00–1:20 | Log in as **Kavita** (incognito) | "Kavita has a book still in production — grey — and ₹850 pending. That's under BookLeaf's ₹1,000 threshold — we'll see the email explain it rolls over to the next quarter." "Data isolation is enforced by Bubble privacy rules on the server, not just hidden on the page: an author's searches can never return another author's rows." |
| 1:20–2:00 | Log in as **admin** | "Admin sees every author with books, earned, pending. Filter by city… by payout status — overdue, pending, fully paid… search by name." Open **View** on Sneha: "Author detail — every book with its royalty breakdown and badge, reusing the author dashboard component." Click **← Back to admin**. |
| 2:00–2:50 | Click **Send summary** on Ananya, then switch to the n8n tab's Executions | "Clicking Send first creates a log row as 'Sending' — that row is a lock, so a double-click within two minutes doesn't make a second call. Bubble posts the author's data to the n8n webhook with a secret header." Show execution: "n8n validates the payload and recomputes the totals itself, works out the payout calendar in code — next payout 14 November — then Groq writes the email. If it's rate-limited or down, Gemini flash and then Gemini lite take over. The email is checked before it's accepted: right name, exact pending amount, no placeholders." |
| 2:50–3:20 | Back to Bubble → Notification log (top row) | "The reply comes back to Bubble and fills the log: Success, timestamp, and the email. It greets Ananya, lists her book, totals, explains the payout date honestly since it's late, and closes warmly in BookLeaf's tone." |
| 3:20–3:50 | Click **Send to all with pending** | "Bulk sends once per author, one at a time — the queue is in the database and one author goes every 15 seconds, which keeps us under Groq's free-tier limit. Rows fill in as each finishes. Kavita's email says her ₹850 rolls over — normal, not a delay." |
| 3:50–4:30 | Error demo: in Bubble API Connector change the key to a wrong value (pre-prepared second API call, or show a pre-recorded Failed row) | "If the webhook key is wrong, n8n rejects it and the log shows Failed with the reason — no endless spinner. Same for AI failures: the row says why, and pressing Send again retries. A repeat request within five minutes is Skipped by n8n as a duplicate." |
| 4:30–4:50 | README | "The README covers the schema, why data goes in the webhook payload, the prompt strategy, and every error path. Thanks for watching." |

Tips
- Record with QuickTime (File → New Screen Recording) or Loom free.
- Do one dry run first so you know the timings. A bulk run of 9 authors takes about 2.5 minutes, so start it and keep talking, or speed that part up in editing.
- n8n blocks a repeat for the same author within 5 minutes (Skipped), so leave 5 minutes after the dry run before recording, or show the Skipped row as the duplicate demo.
