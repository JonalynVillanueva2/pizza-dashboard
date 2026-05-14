# 🍕 Tarro Pizza SOP Dashboard

A single-file local web app for tracking SOPs, checklists, and tasks across all Tarro partner pizza restaurants.

## Features

- **Live dashboard** — Stats cards for Total, Active, Churned, At Risk, and Under Review restaurants
- **View SOP** — Click to open each restaurant's Google Sheet SOP directly
- **Editable status tags** — Click any status badge to change it (Active / Churned / At Risk / Review / Inactive / New). Changes save automatically to your browser.
- **Per-restaurant tasks** — Add, toggle, and delete tasks for each restaurant. All data persists in your browser's local storage.
- **Global notes & reminders** — A collapsible panel (top-right button) for team-wide notes and shared task list.
- **Search & filter** — Find restaurants by name or ID; filter by status tab.
- **Grid / List view toggle**

## How to Use

1. **Open the file** — Just double-click `pizza-sop-dashboard.html` in your file browser. It works in any modern browser (Chrome, Firefox, Edge, Safari).
2. **No server needed** — It's fully self-contained. No install, no dependencies.
3. **Data is saved locally** — All your task changes, status edits, and notes are saved in the browser's `localStorage`. They'll still be there next time you open the file *in the same browser*.

> **Note:** If you open the file in a different browser or clear browser data, your saved changes will not carry over. For shared/team use, consider hosting it on GitHub Pages (see below).

## Hosting on GitHub Pages (free, shareable link)

1. Push this repo to GitHub (see setup below).
2. Go to your repo → **Settings** → **Pages**.
3. Under "Source", select **Deploy from a branch** → choose `main` → folder `/root` → Save.
4. GitHub will give you a public URL like `https://your-username.github.io/your-repo-name/pizza-sop-dashboard.html`.

> **Important:** On GitHub Pages, `localStorage` works the same way — data saves per browser. For a true shared/multi-user experience, you'd need a backend.

## File Structure

```
pizza-sop-dashboard.html   ← The entire app (HTML + CSS + JS in one file)
README.md                  ← This file
```

## Customizing

### Changing restaurant statuses
Click any status badge on a card to get a dropdown with options:
- Active, Churned, At Risk, Review, Inactive, New

### Adding new status types
In the HTML file, find the `STATUS_OPTIONS` array in the `<script>` section and add a new entry:
```js
{value:"OnHold", label:"On Hold", color:"#1565C0", dot:"#1565C0"},
```
Then add a matching CSS class:
```css
.badge-OnHold { background: #E3F2FD; color: #1565C0; }
```

### Changing colors
All brand colors are defined as CSS variables at the top of the `<style>` block:
```css
:root {
  --t-orange:    #FF5722;  /* Tarro primary */
  --t-orange-dk: #E64A19;  /* Hover / dark */
  ...
}
```

### Adding or updating restaurants
Find the `BASE_RESTAURANTS` array in the `<script>` section and add/edit entries:
```js
{
  id:     "R99999",
  name:   "My New Pizza Place",
  status: "Active",
  sop:    "https://docs.google.com/spreadsheets/d/YOUR_ID/edit",
  ml: 1,  // Menu Live      (1 = done, 0 = not done)
  pd: 0,  // Photos Done
  ss: 0,  // Specials Setup
  pa: 1,  // POS Active
  as: 0,  // All Specials Checklist
  dg: 0,  // Dish Group
},
```

---

Built for **Wondersco / Tarro** internal use.
