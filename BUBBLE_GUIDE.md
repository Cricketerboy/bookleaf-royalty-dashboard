# Bubble build guide (click-by-click)

Ye guide upar se neeche follow karo. Har phase ke end mein **✅ Check** hai, use pass karke hi aage badhna.
Bubble ke labels English mein hain, isliye steps bhi wahi naam use karte hain.

Expression likhne ka tareeka: Bubble mein jahan bhi **"Insert dynamic data"** / **"Click"** aata hai, wahan dropdown se chunte jaate ho. Is guide mein expression aise likha hai:
`Search for Books (author = Current User's author) : each item's royalty_pending : sum`
Iska matlab dropdown mein ek-ek karke: *Do a search for* → *Books* → constraint `author = Current User's author` → `:each item's royalty_pending` → `:sum`.

---

## Phase 0 — Setup (10 min)

1. https://bubble.io → **Sign up** (free). New app → name `bookleaf-royalty` → "Start from blank" / skip the AI generator / skip templates.
2. **Settings → General**: app name "BookLeaf Royalties". **Settings → Languages**: English.
3. **Plugins → Add plugins** → search **API Connector** (by Bubble) → Install. (Free.)

---

## Phase 1 — Database (30 min)

### 1.1 Option sets (Data → Option sets)
Create three option sets (each option only needs its Display):

| Option set | Options |
|---|---|
| `Role` | `Author`, `Admin` |
| `LogStatus` | `Sending`, `Success`, `Failed`, `Skipped` |
| `PayoutFilter` | `Fully paid`, `Pending`, `Overdue` |

### 1.2 Data types (Data → Data types)
Create these types and fields. Type names are exact — n8n doesn't care, but the guide's expressions do.

**User** (already exists — add fields)
| Field | Type |
|---|---|
| role | Role (option set) |
| author | Author |

**Author**
| Field | Type |
|---|---|
| author_code | text |
| name | text |
| email | text |
| phone | text |
| city | text |
| joined_date | date |

**Book**
| Field | Type |
|---|---|
| book_code | text |
| author | Author |
| author_code | text |
| title | text |
| isbn | text |
| genre | text |
| status | text |
| publication_date | date |
| mrp | number |
| royalty_per_copy | number |
| copies_sold | number |
| royalty_earned | number |
| royalty_paid | number |
| royalty_pending | number |
| last_payout_date | date |
| overdue_after | date |
| print_partner | text |
| available_on | text — tick **This field is a list** |

**NotificationLog**
| Field | Type |
|---|---|
| author | Author |
| status | LogStatus |
| mode | text (`single` / `bulk`) |
| triggered_by | User |
| subject | text |
| body | text |
| model | text |
| email_delivered | yes / no |
| error_code | text |
| error_message | text |
| warnings | text |
| completed_at | date |

### 1.3 Import the data (Data → App data)
1. Left list → **All Authors** → **Upload** → choose `data/authors.csv` → map each column to the same-named field → Validate → Upload. Expect **10** rows.
2. **All Books** → **Upload** → `data/books.csv` → map columns to fields with the same name. **Leave `author` unmapped** (we link it next). `available_on` is a list — Bubble splits the cell on commas. Expect **18** rows.
   - If Bubble complains about dates, they are `MM/DD/YYYY`, which Bubble accepts.

### 1.4 Link books to authors (one-time setup page)
The CSV only knows `author_code`, so we fill the real `author` link once:
1. **Design → Pages → Add a new page** → name `setup`.
2. Drag a **Repeating Group** → Type of content `Author` → Data source `Search for Authors`.
3. In the first cell: a **Text** `Current cell's Author's name` and a **Button** "Link books".
4. Button → **Start/Edit workflow** → *Data (Things)* → **Make changes to a list of things**
   - List to change: `Search for Books (author_code = Current cell's Author's author_code)`
   - Field: `author` = `Current cell's Author`
5. **Preview** the `setup` page and click "Link books" on all 10 rows.

✅ **Check:** App data → All Books → every row's `author` column shows an Author.

---

## Phase 2 — Accounts (20 min)

Accounts are created **before** privacy rules are switched on (once privacy is on, a new user can't search Authors to link themselves). There is no self sign-up in the final app: BookLeaf creates author accounts.

1. On the `setup` page add: **Input** `Email`, **Input** `Password` (content format: password), **Button** "Create account".
2. Workflow for that button:
   - **Account → Sign the user up**: email = Input Email's value, password = Input Password's value.
   - **Data → Make changes to thing**: Thing = `Current User`; `role` = `Author`; `author` = `Search for Authors (email = Current User's email) : first item`.
   - **Account → Log the user out**.
   - **Element actions → Reset inputs**.
3. Preview `setup` and create (one shared test password for the authors):
   - `priya.sharma@email.com`, `ananya.reddy@email.com`, `kavita.deshmukh@email.com`, `sneha.kulkarni@email.com`
   - `admin@bookleaf.com` with its own admin password
4. **App data → All Users** → open `admin@bookleaf.com` → set `role` = **Admin**, clear `author`.

✅ **Check:** All Users shows 5 users; each author user has `author` filled and role Author; admin has role Admin.

**Afterwards:** delete the `setup` page (or at least its workflows) before submitting — otherwise anyone could create accounts.

---

## Phase 3 — Privacy rules (15 min) — Data → Privacy

For each type: **Define a new rule**. Then **uncheck everything under "Everyone else (default permissions)"** — including *Find this in searches* and *View all fields*.

| Type | Rule name | When | Permissions to tick |
|---|---|---|---|
| Author | `own profile` | `This Author is Current User's author` | Find in searches, View all fields |
| Author | `admin` | `Current User's role is Admin` | Find in searches, View all fields |
| Book | `own books` | `This Book's author is Current User's author` | Find in searches, View all fields |
| Book | `admin` | `Current User's role is Admin` | Find in searches, View all fields |
| NotificationLog | `admin` | `Current User's role is Admin` | Find in searches, View all fields |
| User | `self` | `This User is Current User` | Find in searches, View all fields |
| User | `admin` | `Current User's role is Admin` | Find in searches, View all fields |

Also: **NotificationLog / Author / Book → "Allow auto-binding"** stays unticked everywhere (no one edits these from inputs).

Why this matters: Bubble runs searches on the server and drops anything the rules don't allow, so even a crafted request from the browser console can't read another author's books. Hiding elements on the page is *not* security; these rules are.

✅ **Check:** later, in Phase 4, log in as Priya → you only ever see Priya's 2 books.

---

## Phase 4 — Login page + Author portal (60–90 min)

### 4.1 Login page (`index`)
1. Page `index`: **Input** Email, **Input** Password (format: password), **Button** "Sign in", **Text** `ErrorText` (red, hidden by default — untick *This element is visible on page load*).
2. Workflow "Sign in is clicked":
   - **Account → Log the user in** (email, password, "stay logged in" yes).
   - **Navigation → Go to page** `admin` — *Only when* `Current User's role is Admin`.
   - **Navigation → Go to page** `dashboard` — *Only when* `Current User's role is Author`.
3. Workflow → **General → An unhandled error occurs** → **Element actions → Show** `ErrorText` (text: "Wrong email or password").
4. Small grey text under the form: "Accounts are created by BookLeaf when you sign your publishing agreement. Can't sign in? Contact your publishing manager."

### 4.2 Reusable element `BookRoyaltyList` (used by author dashboard *and* admin detail)
**Design → Reusable elements → New** → name `BookRoyaltyList`, type of content **Author**. (One component, two pages: change it once, both update.)

Inside it:
1. **Group "Totals"** (row layout) with 3 cards:
   - Total earned: `₹` + `Search for Books (author = Parent group's Author) : each item's royalty_earned : sum` (formatted as number, 0 decimals, with thousands separator)
   - Total paid: same with `royalty_paid`
   - Total pending: same with `royalty_pending`
2. **Text "ThresholdNote"** (small, grey): "Your pending balance is below the ₹1,000 payout threshold, so it rolls over to the next quarter (BookLeaf policy)." → visible only when pending sum `> 0` **and** `< 1000` (Conditional: When … is visible; untick visible on load).
3. **Repeating Group "Books"** → Type `Book` → source `Search for Books (author = Parent group's Author)` sorted by `publication_date`, descending; layout: column, fit height to content.
   Each cell shows:
   - Title (bold), `ISBN: … · Genre … · Status …`
   - `Published: ` publication_date (formatted 4/2/26 style, or "—" when empty) · `MRP ₹` mrp
   - `Available on: ` `Current cell's Book's available_on : join with ", "`
   - Sold · Earned · Paid · Pending (₹)
   - `Last payout: ` last_payout_date (Conditional: when empty → text "Never")
   - **Badge** (a Group with a Text inside, rounded corners). Default = **yellow** (#FEF3C7 background, text "Pending — within payout cycle"). Conditionals, in this order (later ones win):
     1. When `Current cell's Book's royalty_pending is 0` → green (#DCFCE7), text "Fully paid"
     2. When `Current cell's Book's royalty_pending > 0` **and** `Current cell's Book's overdue_after < Current date/time` → red (#FEE2E2), text "Overdue"
     3. When `Current cell's Book's status doesn't contain "Published"` → grey (#F1F5F9), text "In production"

Badge rule (from the brief): green = fully paid; yellow = pending inside the cycle; red = pending and the last payout (or publication, if never paid) is more than 90 days ago. `overdue_after` is that "+90 days" date, pre-computed in the CSV, so the rule is a plain comparison.

### 4.3 Page `dashboard` (author)
1. Page workflow **When page is loaded** → **Go to page `index`** — *Only when* `Current User is logged out` **or** `Current User's role is not Author`.
2. Header: "Welcome, `Current User's author's name`" + **Logout** button (Account → Log the user out → Go to page index).
3. Drag in `BookRoyaltyList` → its data source = `Current User's author`.

✅ **Check:**
- Login as Priya → 2 books (Whispers of the Ganges red, The Saffron Diaries green), totals ₹19,908 / ₹16,338 / ₹3,570.
- Login as Kavita → Raising Roots grey "In production", The Nagpur Notebooks red + threshold note.
- Browser console / URL tricks can't show other authors' books (Phase 3 rules).

---

## Phase 5 — n8n connection (API Connector) (20 min)

Do this after the n8n workflow is live (see `N8N_SETUP.md`) — you need its **Production URL** and webhook key.

**Plugins → API Connector → Add another API**
- API Name: `BookLeaf n8n`
- Authentication: `None or self-handled`
- **Shared headers**: key `X-BookLeaf-Key`, value = your webhook secret, tick **Private** (the key stays on Bubble's server, never in the browser).

**Add another call**
- Name: `Send summary` · Use as: **Action** · Data type: **JSON**
- `POST` · URL: `https://YOUR-N8N-HOST/webhook/bookleaf-royalty-summary`
- Header: `Content-Type: application/json`
- Body type: **JSON**, body:
  ```
  {
    "request_id": "<request_id>",
    "mode": "<mode>",
    "triggered_by": "<triggered_by>",
    "author": <author_json>,
    "books": <books_json>
  }
  ```
- For each parameter untick **Private** (they are dynamic). Initialization values:
  - request_id: `init-test-1`
  - mode: `single`
  - triggered_by: `admin@bookleaf.com`
  - author_json: `{"author_code":"AUTH003","name":"Ananya Reddy","email":"ananya.reddy@email.com","city":"Hyderabad"}`
  - books_json: `[{"book_code":"BK005","title":"Between Two Temples","status":"Published & Live","publication_date":"2024-07-05","last_payout_date":"","copies_sold":"67","royalty_earned":"2546","royalty_paid":"0","royalty_pending":"2546","available_on":"Amazon India, BookLeaf Store"}]`
- Tick **Include errors in response and allow workflow actions to continue**.
- Click **Initialize call** → you should see `status: Success`, a `subject` and `body`. Save.
  (If it shows `Skipped`, you initialized twice within 5 minutes — change request_id and wait, or initialize with another author.)

---

## Phase 6 — Admin portal (90–120 min)

Page `admin`. Page workflow **When page is loaded** → Go to `index` *Only when* `Current User is logged out or Current User's role is not Admin`.

### 6.1 Custom states (select the page → ⓘ → Add a new custom state)
| State | Type | List? |
|---|---|---|
| `tab` | text | no (default `authors`) |
| `bulk_queue` | Author | **yes** |
| `bulk_total` | number | no |

### 6.2 Header + tabs
Two buttons "Authors" / "Notification log" → *Set state* `tab` = `authors` / `logs`. Groups `GroupAuthors` and `GroupLogs` are visible only when `tab` matches (Conditional on each group). Logout button as on the dashboard.

### 6.3 Authors tab (`GroupAuthors`)
Filters row:
- **Input `SearchName`** (placeholder "Search by name")
- **Dropdown `CityFilter`** — choices: dynamic, `Search for Authors : each item's city : unique elements : sorted`; placeholder "All cities"
- **Dropdown `StatusFilter`** — choices: `All PayoutFilters`, option caption `Display`; placeholder "All payout statuses"

**Repeating Group `AuthorsRG`** → Type `Author`. Data source (default, untick *Ignore empty constraints* = leave it ticked):
`Search for Authors (name contains SearchName's value, city = CityFilter's value)` sorted by name.

Payout-status filter = three **Conditionals** on the RG (Data source changes when the dropdown changes):
- When `StatusFilter's value is Overdue` → Data source =
  `Search for Authors (name contains…, city = …) : intersect with Search for Books (royalty_pending > 0, overdue_after < Current date/time) : each item's author`
- When `StatusFilter's value is Pending` →
  `Search for Authors (…) : intersect with Search for Books (royalty_pending > 0) : each item's author : minus list Search for Books (royalty_pending > 0, overdue_after < Current date/time) : each item's author`
- When `StatusFilter's value is Fully paid` →
  `Search for Authors (…) : minus list Search for Books (royalty_pending > 0) : each item's author`

(An author is *Overdue* if any book is overdue, *Pending* if something is pending but nothing overdue, *Fully paid* if nothing is pending.)

Each row shows: name · city · books = `Search for Books (author = Current cell's Author) : count` · total earned (`…:each item's royalty_earned:sum`) · total pending (`…royalty_pending:sum`) · **last summary** = `Search for NotificationLogs (author = Current cell's Author) : sorted by Created Date desc : first item's status's Display` (or "—") · buttons **View** and **Send summary**.

- **View** → *Show* `PopupAuthor` + *Display data in a group/popup* → PopupAuthor, data = Current cell's Author.
- **Send summary** → *Custom events → Trigger a custom event* `send_summary` with `author` = Current cell's Author, `mode` = `single`.
  Conditionals on the Send button (double-click guard, database-backed so it also works across tabs and admins):
  - When `Search for NotificationLogs (author = Current cell's Author, status = Sending, Created Date > Current date/time +(minutes) -2) : count > 0` → text "Sending…", **This element isn't clickable**, background grey.

**Bulk button** above the table: text = `Send to all with pending (` & `Search for Books (royalty_pending > 0) : each item's author : unique elements : count` & `)`.
Workflow:
1. *Set state* `bulk_queue` = `Search for Books (royalty_pending > 0) : each item's author : unique elements`
2. *Set state* `bulk_total` = that list's `:count`
3. *Trigger a custom event* `bulk_next`
Conditional: when `bulk_queue : count > 0` → text "Sending… (" & bulk_queue:count & " left)", not clickable.

### 6.4 Custom event `send_summary` (Workflow tab → General → New custom event)
Parameters: `author` (Author), `mode` (text).

| # | Action | Settings | Only when |
|---|---|---|---|
| 1 | Data → **Create a new thing** NotificationLog | author = author, status = `Sending`, mode = mode, triggered_by = Current User | `Search for NotificationLogs (author = author, status = Sending, Created Date > Current date/time +(minutes) -2) : count is 0` |
| 2 | Plugins → **BookLeaf n8n – Send summary** | request_id = `Result of step 1's unique id`; mode = mode; triggered_by = `Current User's email`; author_json and books_json = the two templates below | `Result of step 1 is not empty` |
| 3 | Data → **Make changes to thing** Result of step 1 | status = `All LogStatuses : filtered (Display = Result of step 2's status) : first item`; subject, body, model, email_delivered, error_code, error_message, warnings = Result of step 2's fields; completed_at = `Result of step 2's completed_at : converted to date` (or Current date/time) | `Result of step 1 is not empty and Result of step 2's returned an error is no` |
| 4 | Data → **Make changes to thing** Result of step 1 | status = `Failed`; error_code = `WEBHOOK_ERROR`; error_message = `"n8n call failed (" & Result of step 2's error status code & "): " & Result of step 2's error body : truncated to 300`; completed_at = Current date/time | `Result of step 1 is not empty and Result of step 2's returned an error is yes` |

**author_json** (type it in the param box, inserting dynamic data where shown in [ ]):
```
{"author_code":"[author's author_code]","name":[author's name:formatted as JSON-safe],"email":[author's email:formatted as JSON-safe],"city":[author's city:formatted as JSON-safe]}
```
**books_json**:
```
[[Search for Books (author = author) :format as text]]
```
In `:format as text` → *Content to show per list item*:
```
{"book_code":"[This Book's book_code]","title":[This Book's title:formatted as JSON-safe],"status":[This Book's status:formatted as JSON-safe],"publication_date":"[This Book's publication_date:formatted as custom yyyy-mm-dd]","last_payout_date":"[This Book's last_payout_date:formatted as custom yyyy-mm-dd]","copies_sold":"[This Book's copies_sold]","royalty_earned":"[This Book's royalty_earned]","royalty_paid":"[This Book's royalty_paid]","royalty_pending":"[This Book's royalty_pending]","available_on":[This Book's available_on:join with ", ":formatted as JSON-safe]}
```
*Delimiter* `,`

Why the payload carries the data (instead of n8n reading Bubble's Data API): see README → "Integration".

### 6.5 Custom event `bulk_next` (the bulk loop)
Bubble's free plan has no backend workflows, so the bulk send is a small loop on the page that processes one author at a time:

| # | Action | Only when |
|---|---|---|
| 1 | Trigger custom event `send_summary` — author = `admin's bulk_queue : first item`, mode = `bulk` | `bulk_queue : count > 0` |
| 2 | Set state `bulk_queue` = `admin's bulk_queue minus item admin's bulk_queue : first item` | — |
| 3 | **Schedule a custom event** `bulk_next`, delay **15** seconds | `bulk_queue : count > 0` |

One request per author, never two (an author appears once in the unique list; step 1 of `send_summary` and n8n both block repeats). The 15-second gap keeps us under Groq's free limit (8,000 tokens/minute ≈ 4 emails). 8 authors take about 2 minutes. Keep the tab open until "Sending… (0 left)".

### 6.6 Author detail popup `PopupAuthor` (type of content Author)
- Name, email, phone, city, joined date.
- The **`BookRoyaltyList`** reusable element, data source = `Parent group's Author` (same component as the author dashboard).
- **Payout history**: Repeating group of `Search for Books (author = Parent group's Author)` showing title · paid ₹ · last payout date ("Never" when empty). (The dataset records the last payout per book, so this is what history we have.)
- **Summaries sent**: Repeating group `Search for NotificationLogs (author = Parent group's Author)` sorted Created Date desc → date · status · subject.
- Button **Generate & Send Royalty Summary** → trigger `send_summary` (author = Parent group's Author, mode = single) with the same "Sending…" conditional as the row button.

### 6.7 Notification log tab (`GroupLogs`)
Repeating Group → Type `NotificationLog` → `Search for NotificationLogs` sorted by Created Date descending.
Columns: Created Date (`formatted as 10/20/26 5:40 pm`) · author's name · mode · **status badge** · subject (or error_message when Failed) · completed_at · email delivered (yes/no) · button **View** (popup with subject + body text, multiline).

Status badge conditionals: Success green, Failed red, Skipped grey, Sending blue — plus
- When `status is Sending and Created Date < Current date/time +(minutes) -2` → red, text **"Timed out"**. (If the browser closed or n8n never answered, the row doesn't spin forever.)

Row button **Retry** (visible when status is Failed or "Timed out") → trigger `send_summary` with that log's author.

✅ **Check (end-to-end):**
1. Send summary for Ananya → row says "Sending…" → a few seconds later the log shows **Success** with a subject; View shows the email.
2. Double-click Send fast → only **one** log row (the second click is blocked).
3. Bulk → one log per pending author (8 authors), all Success (or a clear Failed reason).
4. In n8n, temporarily break the Gemini credential → Send → log shows **Failed** with `AI_AUTH` / `AI_UNAVAILABLE`. Fix it afterwards.
5. In API Connector, temporarily set a wrong `X-BookLeaf-Key` → Send → log shows **Failed** with `WEBHOOK_ERROR (403)`. Fix it afterwards.

---

## Phase 7 — Ship (15 min)
1. Delete the `setup` page.
2. Top bar → **Deploy / Preview**. The free plan serves the app at `https://bookleaf-royalty.bubbleapps.io/version-test` — that is your live URL.
3. **Settings → Collaboration** → add the email BookLeaf gives you as collaborator.
4. Put the URL and test logins into README.
