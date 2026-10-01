# TÜİK rent reference

`rent-reference.json` is public reference data, not a projection rule. The UI copies its percentage into the user's editable future rent-growth assumption only when they choose **Use as my assumption**. The projection never fetches live data.

The value is the **12-month moving-average CPI change** (`DEGISIM=5`) for Türkiye from TÜİK's official `TR,DF_TUFE_SDMX_TT10,1.0` dataset. Run `node scripts/update-rent-reference.mjs` to refresh the snapshot. The included GitHub Actions workflow runs that updater daily when this repository is hosted on GitHub with write-enabled Actions. Other deployments should schedule the same command before publishing the static site.

If the official endpoint fails, the updater exits without replacing the last verified file. The browser uses that file or its last saved copy, labels it dated after `nextPublicationAt`, and always allows a manual assumption. A new observation's `publishedAt` is the time it was first seen in the official dataset unless an exact bulletin date is verified separately; `publicationDateBasis` records this distinction. The initial August 2026 snapshot uses TÜİK's verified 3 September 2026 bulletin date.
