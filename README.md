# Safar Pakistan — Tourism Discovery Website

A responsive, animated tourism discovery website built with **HTML5, CSS3 and vanilla JavaScript**. It uses the supplied CSV datasets, transformed into compact JSON files so the published site does not need to download the 41 MB source directory on every visit.

## Included features

- Premium travel-inspired layout and responsive mobile navigation.
- Searchable destination directory with category filters and detail dialogs.
- Searchable accommodation directory with region/contact filters, sorting and pagination.
- Call, website and map links only when the source data contains usable values.
- Responsive layouts, scroll reveals, hover transitions and reduced-motion support.
- Destination and hotel details dialogs.
- Helpful empty and loading states.
- No paid API or backend required.

## Data included

- `data/destinations.json` — 69 tourist destination records derived from `Tourist Destinations.csv`.
- `data/hotels.json` — 12200 accommodation records derived from the two hotel-related datasets.
- `data/source/` — original CSV files for reference and future data refreshes.

The broad `combined_data.csv` source contains many types of places, not only hotels. The generated `hotels.json` keeps records whose names appear to describe accommodation, plus the dedicated Lahore hotel records. This is a practical heuristic, not a guarantee that every listing is a hotel. Review records before using them commercially.

**Email note:** the supplied datasets did not provide a dedicated email field in the inspected source columns. Email links are therefore not fabricated. The website supports an email field if you add verified addresses later.

## Run locally (VS Code)

Do not open `index.html` directly using `file://`, because browsers commonly block `fetch()` requests for local data files.

### Option A — VS Code Live Server
1. Extract the ZIP.
2. Open the `safar-pakistan` folder in VS Code.
3. Install the **Live Server** extension if you do not already have it.
4. Right-click `index.html` and choose **Open with Live Server**.
5. Check the website in your browser.

### Option B — Python local server
If Python is installed, open a terminal inside the project folder and run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Refresh data after changing CSV files

The website loads the optimized JSON files in `data/`. If you edit the source CSVs, run:

```bash
python scripts/refresh_data.py
```

This regenerates `data/hotels.json` and `data/destinations.json` from the files under `data/source/`. The script uses pandas. Install it first if needed:

```bash
python -m pip install pandas
```

Review the generated records after refreshing. The hotel selection from the broad directory is based on accommodation-related keywords and may require manual quality checks.

## Deploy on GitHub and Vercel

1. Create a new GitHub repository.
2. Upload the contents of this project folder.
3. In Vercel, choose **Add New → Project** and import the repository.
4. For a plain static site, leave the framework preset as **Other** and do not set a build command.
5. Set the output directory to `.` if Vercel requests one.
6. Deploy.
7. Test the deployed site, including destination search, hotel filters, map links, and mobile navigation.

Keep the `data/` directory in the repository because the deployed website needs the JSON data files.

## Project structure

```text
safar-pakistan/
├── index.html
├── README.md
├── .gitignore
├── assets/
│   ├── css/
│   │   ├── styles.css
│   │   ├── responsive.css
│   │   └── animations.css
│   ├── js/
│   │   └── app.js
│   └── images/
├── data/
│   ├── hotels.json
│   ├── destinations.json
│   └── source/
│       ├── combined_data.csv
│       ├── hotels-in-lahore-pakistan.csv
│       └── Tourist Destinations.csv
└── scripts/
    └── refresh_data.py
```

## Before public launch

- Check data accuracy and remove obsolete listings.
- Confirm you have permission to publish and redistribute the supplied contact data.
- Verify all phone numbers and websites before relying on them.
- Review image usage rights and replace image URLs if needed.
- Test the site on a real mobile device.
- Check the browser console after deployment.

## Limitations

- The supplied data does not include reliable hotel email addresses, live prices, availability, ratings or booking functionality.
- Map actions open external map pages; this version does not embed an interactive map.
- Destination photos are illustrative image references and are not individually matched or verified against every destination.
- Contact and location information may be incomplete or out of date.
