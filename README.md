# Link Shrinker

URL shortener with QR codes. © GaryM

Runs on Render (free), stores links in Supabase (free).

## What's in here

- `server.js` : the app. Creates links, does the redirects, counts clicks.
- `public/index.html` : the page you use.
- `schema.sql` : sets up the database table. Run once in Supabase.
- `package.json` : tells Render what to install.

## Setup (about 15 to 20 minutes)

### 1. Supabase (5 mins)

1. Create a new project in Supabase. Pick a region near you (London if it's offered). Save the database password somewhere, though you won't need it for this.
2. Wait for the project to finish setting up.
3. Go to **SQL Editor**, paste in everything from `schema.sql`, and click **Run**. You should see "Success".
4. Go to **Project Settings > API Keys** (or **API**) and copy two things:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **Secret key** (starts `sb_secret_`). On older projects it's called the **service_role** key. Do NOT use the publishable/anon key.

Keep the secret key private. Never paste it into the page or commit it to GitHub.

### 2. GitHub (5 mins)

1. Create a new repo, e.g. `link-shrinker`. Private is fine.
2. Upload everything in this folder EXCEPT `node_modules` if it's there. You need: `server.js`, `package.json`, `schema.sql`, `README.md`, `.gitignore` and the `public` folder with `index.html` inside it.

### 3. Render (5 to 10 mins)

1. In Render, click **New > Web Service** and connect the `link-shrinker` repo.
2. Settings:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
3. Under **Environment Variables**, add these three:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | your Project URL |
   | `SUPABASE_SECRET_KEY` | your secret key |
   | `ADMIN_PASSWORD` | a password you choose |

4. Click **Create Web Service** and wait for the deploy to finish (a few minutes the first time).
5. Open your Render address (e.g. `https://link-shrinker-xxxx.onrender.com`), enter your password, and shorten your first link.

## How it works

- Your short links look like `https://link-shrinker-xxxx.onrender.com/velar`.
- Anyone can click a short link. Only you (with the password) can create, see or delete links.
- Click **QR** next to any link to show its QR code, then **Download QR** to save it as a PNG.
- **Export CSV** saves a copy of all your links. Do this now and then, as the free database has no backups.

## Things to know

- **Render free plan sleeps** after about 15 minutes of no use. The next click wakes it up but takes around 30 seconds.
- **Supabase free plan pauses** after a week with no activity. If your links stop working, log into Supabase and restore the project.
- If you forget your password, change `ADMIN_PASSWORD` in Render's environment settings. It redeploys on its own.
- Codes are saved in lowercase, so `/Velar` and `/velar` are the same link.
