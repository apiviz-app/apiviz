# Tests de bout en bout

Navigateur Chrome piloté par Playwright, base Supabase simulée (aucune donnée réelle touchée).

```
npm pack @supabase/supabase-js@2.45.4 && tar xzf supabase-supabase-js-2.45.4.tgz
python3 tests/fabrique_tests.py          # crée test_ex.py, test_rg.py… à partir de test_hl.py
python3 tests/test_hl.py . package/dist/umd/supabase.js
```

`test_hl.py` : hors ligne. `etapes_ex` : exploitations et invitations. `etapes_rg` : registre.
`etapes_rp` : rappels. `etapes_vr` : visite de plusieurs ruches. `etapes_et` : étiquettes.
