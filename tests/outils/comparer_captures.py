"""Compare deux séries de captures (HTML normalisé) : python3 tests/outils/comparer_captures.py <avant> <après> [écran…]
Code de sortie 0 si tous les écrans demandés sont identiques. Les différences sont affichées en diff unifié."""
import difflib, pathlib, sys
avant, apres = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
filtre = set(sys.argv[3:])
ecarts = 0
for f in sorted(avant.glob("*.html")):
    if filtre and f.stem.rsplit("-", 1)[0] not in filtre: continue
    g = apres / f.name
    a = f.read_text(encoding="utf-8").splitlines()
    b = g.read_text(encoding="utf-8").splitlines() if g.exists() else ["(capture absente)"]
    if a != b:
        ecarts += 1
        print(f"=== {f.stem} : différent")
        sys.stdout.writelines(l + "\n" for l in list(difflib.unified_diff(a, b, "avant", "après", n=1, lineterm=""))[:60])
    else:
        print(f"    {f.stem} : identique")
print(f"{ecarts} écran(s) différent(s)")
sys.exit(1 if ecarts else 0)
