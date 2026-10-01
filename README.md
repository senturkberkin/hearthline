# Hearthline

Rent-vs-buy scenario simulator. The active consumer website is the React app in [design-preview](design-preview/README.md); the original static MVP files at this root are retained for financial parity and migration safety.

```sh
npm --prefix design-preview install
npm run dev
npm test
npm run build
```

Visit <http://127.0.0.1:4174/> while the development server is running. The app supports English and Turkish, light and dark modes, guided scenario entry, and live calculated results. Financial inputs remain in this browser session.
