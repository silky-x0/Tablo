<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Persistence uses @capacitor-community/sqlite (jeep-sqlite + public/assets/sql-wasm.wasm on web, which must match the sql.js version jeep-sqlite was built with); UI state is in memory and written through to SQLite, so screens stay synchronous while data survives restarts.
