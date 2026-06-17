// Polish translations of UI strings, keyed by the exact English source string.
// Missing keys fall back to English. ML-specific terms are deliberately left in
// English so the Polish text reads naturally to practitioners.

export default {
  // ---- app shell ----
  "Hands-on adversarial ML for COAE prep · educational / authorized use only":
    "Praktyczny adversarial ML do nauki przed COAE · wyłącznie do celów edukacyjnych / autoryzowanych testów",
  "Adversarial Examples": "Adversarial Examples",
  "Data Poisoning": "Data Poisoning",
  "Membership Inference": "Membership Inference",
  "Differential Privacy": "Differential Privacy",
  "LLM Attacks": "Ataki na LLM",
  ready: "gotowe",
  soon: "wkrótce",
  Language: "Język",

  // ---- modal / info ----
  "What it is": "Czym jest",
  "How it works": "Jak działa",
  "What it results in": "Do czego prowadzi",
  Close: "Zamknij",
  "Learn more": "Dowiedz się więcej",
  "What is this?": "Co to jest?",

  // ---- common controls ----
  Dataset: "Dataset",
  "Sample index": "Indeks próbki",
  Attack: "Atak",
  "Run attack": "Uruchom atak",
  "Running…": "Liczę…",
  MNIST: "MNIST",
  "CIFAR-10": "CIFAR-10",

  // ---- adversarial tab ----
  "Single-step L∞ sign attack (Goodfellow 2015).":
    "Jednokrokowy atak L∞ oparty na znaku gradientu (Goodfellow 2015).",
  "Iterative L∞ attack projected into an ε-ball (Madry 2018).":
    "Iteracyjny atak L∞ rzutowany do kuli ε (Madry 2018).",
  "Iterative minimal-L2 attack (Moosavi-Dezfooli 2016).":
    "Iteracyjny atak o minimalnej normie L2 (Moosavi-Dezfooli 2016).",
  "Elastic-net (L1+L2) attack with c binary search (Chen 2018).":
    "Atak elastic-net (L1+L2) z binary search po c (Chen 2018).",
  "Jacobian saliency-map L0 (sparse) attack (Papernot 2016).":
    "Atak L0 (rzadki) oparty na saliency map z jakobianu (Papernot 2016).",
  "epsilon (L∞ budget)": "epsilon (budżet L∞)",
  "alpha (step size)": "alpha (rozmiar kroku)",
  steps: "kroki",
  "gamma (max % pixels)": "gamma (max % pikseli)",
  "theta (per-pixel push)": "theta (zmiana na piksel)",
  "max iterations": "max iteracji",
  overshoot: "overshoot",
  "beta (L1 weight)": "beta (waga L1)",
  "steps / c-search inner": "kroki / wewnętrzne c-search",
  "learning rate": "learning rate",
  Original: "Oryginał",
  Adversarial: "Adversarial",
  "Perturbation (scaled)": "Perturbacja (przeskalowana)",
  Result: "Wynik",
  Misclassified: "Błędna klasyfikacja",
  Robust: "Odporny",
  "Pred change": "Zmiana predykcji",
  "Adv confidence": "Confidence adv",

  // ---- poisoning tab ----
  "Label Flipping": "Label Flipping",
  "Clean-Label (Poison Frogs)": "Clean-Label (Poison Frogs)",
  "Flip mode": "Tryb flip",
  "Random (untargeted)": "Losowy (untargeted)",
  "Targeted (source → target)": "Celowany (source → target)",
  "fraction of labels flipped": "ułamek odwróconych labeli",
  "fraction of source class flipped": "ułamek odwróconej klasy source",
  "source class": "klasa source",
  "→ target label": "→ label target",
  "Poison & retrain": "Zatruj i przetrenuj",
  "Training…": "Trenuję…",
  "Flips training labels, then retrains the linear head on frozen CNN features and compares test accuracy to a clean baseline.":
    "Odwraca labele treningowe, potem dotrenowuje linear head na zamrożonych features CNN i porównuje test accuracy z czystym baseline.",
  "Clean accuracy": "Accuracy (clean)",
  "Poisoned accuracy": "Accuracy (poisoned)",
  "Accuracy drop": "Spadek accuracy",
  "Labels flipped": "Odwrócone labele",
  "Per-class test accuracy": "Test accuracy per klasa",
  "clean model": "model clean",
  "poisoned model": "model poisoned",
  "Target test index": "Indeks próbki test (cel)",
  "base / poison class": "klasa base / poison",
  "num poisons": "liczba poisonów",
  "beta (stay near base)": "beta (trzymaj się base)",
  "craft steps": "kroki craftowania",
  "Craft poisons & retrain": "Stwórz poisony i przetrenuj",
  "Crafting…": "Tworzę…",
  "Poison Frogs: craft images that look like the base class but collide with the target's features. Injected with their correct base label, they make the specific target test image get misclassified — without any mislabeling.":
    "Poison Frogs: tworzy obrazy, które wyglądają jak klasa base, ale zderzają się z features celu. Wstrzyknięte z poprawnym labelem base sprawiają, że konkretny obraz-cel jest błędnie klasyfikowany — bez żadnego błędnego etykietowania.",
  "Pred before": "Predykcja przed",
  "Pred after": "Predykcja po",
  "Feat dist: base→target": "Dystans feat: base→target",
  "Feat dist: poison→target": "Dystans feat: poison→target",

  // ---- membership tab ----
  "CIFAR-10 (leaks more)": "CIFAR-10 (wycieka więcej)",
  "shadow models": "shadow models",
  "members / non-members each": "members / non-members każdego",
  "epochs (overfitting)": "epoki (overfitting)",
  "Run attack ": "Uruchom atak ",
  "Training shadows…": "Trenuję shadows…",
  "Attack AUC": "AUC ataku",
  "Attack accuracy": "Accuracy ataku",
  Precision: "Precision",
  Recall: "Recall",
  "Baseline (chance)": "Baseline (przypadek)",
  "Confidence distribution — members vs non-members":
    "Rozkład confidence — members vs non-members",
  "members (in training set)": "members (w zbiorze treningowym)",
  "non-members": "non-members",
  "confidence (max posterior)": "confidence (max posterior)",

  // ---- privacy tab ----
  "Privacy budgets ε (pick 1–6)": "Budżety prywatności ε (wybierz 1–6)",
  "δ (delta)": "δ (delta)",
  epochs: "epoki",
  "clip norm C": "norma clip C",
  "Train & sweep ε": "Trenuj i przeszukaj ε",
  "Training DP models…": "Trenuję modele DP…",
  "Select at least one ε value.": "Wybierz co najmniej jedną wartość ε.",
  "Baseline accuracy": "Accuracy baseline",
  "Baseline MIA AUC": "MIA AUC baseline",
  "Tightest ε": "Najmniejszy ε",
  "Privacy / utility trade-off": "Kompromis prywatność / użyteczność",
  "test accuracy (utility)": "test accuracy (użyteczność)",
  "MIA AUC (leak; 0.5 = none)": "MIA AUC (wyciek; 0.5 = brak)",
  "Per-budget detail": "Szczegóły per budżet",

  // ---- LLM tab ----
  "Attack scenario": "Scenariusz ataku",
  "🛡 Defense (hardened prompt + output filter)":
    "🛡 Obrona (utwardzony prompt + filtr wyjścia)",
  "Reset chat": "Reset czatu",
  loaded: "załadowany",
  preload: "wczytaj",
  "loading…": "wczytuję…",
  "Victim system prompt — goal: extract the secret":
    "System prompt ofiary — cel: wydobyć secret",
  hide: "ukryj",
  show: "pokaż",
  "Try a payload:": "Wypróbuj payload:",
  payload: "payload",
  "Send an attack prompt to begin. Replies run on a local CPU model — expect a few seconds each (first reply also loads the model).":
    "Wyślij prompt ataku, by zacząć. Odpowiedzi liczy lokalny model na CPU — licz się z kilkoma sekundami na każdą (pierwsza odpowiedź dodatkowo ładuje model).",
  attacker: "atakujący",
  "victim model": "model ofiary",
  "thinking…": "myślę…",
  "Type an attack prompt (or load a payload above)…":
    "Wpisz prompt ataku (albo załaduj payload powyżej)…",
  Send: "Wyślij",
  "🔓 secret leaked": "🔓 secret wyciekł",
  "🛡 leaked but redacted by guardrail": "🛡 wyciekł, ale zredagowany przez guardrail",
  "✓ resisted": "✓ obronił się",

  // ---- LLM scenario titles (from backend) ----
  "Prompt Injection — support bot": "Prompt Injection — bot wsparcia",
  "Jailbreak — refusal bypass": "Jailbreak — obejście odmowy",
  "System-prompt leakage": "Wyciek system promptu",

  // ---- dynamic sentences with {placeholders} ----
  "Targeted collapse — class {n} recall: {a} → {b}.":
    "Celowany kolaps — recall klasy {n}: {a} → {b}.",
  "The model now reads many source-class inputs as the target label.":
    "Model odczytuje teraz wiele wejść klasy source jako label target.",
  "{a} → {b} (poisoned label)": "{a} → {b} (label poisoned)",
  "Attack succeeded — target {a} now read as {b}":
    "Atak udany — cel {a} odczytany teraz jako {b}",
  "Attack failed — target prediction unchanged":
    "Atak nieudany — predykcja celu bez zmian",
  "Target ({c}) — pred {a} → {b}": "Cel ({c}) — pred {a} → {b}",
  "Base class: {b}": "Klasa base: {b}",
  "Poison {n} (labeled {b})": "Poison {n} (label {b})",

  "Mean confidence — members {a} vs non-members {b}.":
    "Średni confidence — members {a} vs non-members {b}.",
  "The wider this gap, the more the model leaks.":
    "Im większa ta różnica, tym bardziej model wycieka.",
  "Trains {n} shadow models to mimic the target, learns a membership classifier from their posteriors, then attacks the target. Raw-pixel MLPs overfit small subsets, so members get higher confidence than non-members.":
    "Trenuje {n} shadow models naśladujących cel, uczy klasyfikator membership z ich posteriors, a potem atakuje cel. MLP na surowych pikselach przeuczają się na małych podzbiorach, więc members dostają wyższy confidence niż non-members.",
  "Target overfitting — train accuracy {a} vs test {b} (gap {c}).":
    "Overfitting celu — train accuracy {a} vs test {b} (gap {c}).",
  "Membership inference feeds on exactly this generalization gap; differential privacy (next tab) shrinks it.":
    "Membership inference żywi się dokładnie tą luką w generalizacji; differential privacy (następna zakładka) ją zmniejsza.",

  "Trains one DP-SGD model per ε (Opacus: per-sample clipping + Gaussian noise), plus a non-private baseline. Reports test accuracy and a confidence-threshold membership-inference AUC. Several models train per run — give it ~30s.":
    "Trenuje jeden model DP-SGD na każdy ε (Opacus: per-sample clipping + szum Gaussa) plus baseline bez prywatności. Raportuje test accuracy oraz AUC membership inference oparte na progu confidence. Na jedno uruchomienie trenuje się kilka modeli — daj temu ~30s.",
  "Acc @ ε={n}": "Acc @ ε={n}",
  "MIA AUC @ ε={n}": "MIA AUC @ ε={n}",
  "DP-SGD trades utility for privacy: tighter budgets (smaller ε) add more noise, lowering accuracy and pulling the membership-inference AUC back toward 0.5 (no leak) — defending the attack from the previous tab.":
    "DP-SGD wymienia użyteczność na prywatność: ciaśniejsze budżety (mniejszy ε) dodają więcej szumu, obniżając accuracy i ściągając AUC membership inference z powrotem ku 0.5 (brak wycieku) — broniąc atak z poprzedniej zakładki.",
  "δ = {d}, clip norm = {c}, {n} members, {e} epochs.":
    "δ = {d}, norma clip = {c}, {n} members, {e} epok.",
  "accuracy (—) & MIA AUC (—), 0–1 · dashed = non-private baseline":
    "accuracy (—) i MIA AUC (—), 0–1 · przerywana = baseline bez prywatności",
  "ε target": "ε docelowy",
  "ε spent": "ε wykorzystany",
  "noise σ": "szum σ",
  accuracy: "accuracy",
  "MIA AUC": "MIA AUC",
  "∞ (none)": "∞ (brak)",

  // ---- defense (adversarial training) tab ----
  "Adversarial Training": "Adversarial Training",
  "Training attack": "Atak treningowy",
  "train ε (robustness budget)": "train ε (budżet odporności)",
  "fine-tune epochs": "epoki fine-tune",
  "Hardening model…": "Utwardzam model…",
  "Adversarially train": "Trenuj adversarialnie",
  "Clones the pretrained model and fine-tunes it on adversarial examples regenerated every batch, then compares clean and robust accuracy to the undefended baseline. A few models' worth of attacks run per request — give it ~30–60s.":
    "Klonuje pretrenowany model i dotrenowuje go na adversarial examples generowanych od nowa w każdym batchu, a potem porównuje clean i robust accuracy z niebronionym baseline. Na jedno żądanie odpala się sporo ataków — daj temu ~30–60s.",
  "Clean acc — baseline": "Clean acc — baseline",
  "Clean acc — defended": "Clean acc — defended",
  "PGD attack success — baseline": "PGD attack success — baseline",
  "PGD attack success — defended": "PGD attack success — defended",
  "Adversarial training kept clean accuracy ({a} → {b}) but cut the PGD attack success rate from {c} to {d} at ε={e}. The hardened model has seen perturbed inputs during training, so its decision boundary sits farther from natural images.":
    "Adversarial training utrzymał clean accuracy ({a} → {b}), ale obniżył PGD attack success z {c} do {d} przy ε={e}. Utwardzony model widział perturbowane wejścia podczas treningu, więc jego decision boundary leży dalej od naturalnych obrazów.",
  "FGSM acc @ ε={e} — base": "FGSM acc @ ε={e} — base",
  "FGSM acc @ ε={e} — def": "FGSM acc @ ε={e} — def",
  "PGD acc @ ε={e} — base": "PGD acc @ ε={e} — base",
  "PGD acc @ ε={e} — def": "PGD acc @ ε={e} — def",
  "Robustness vs perturbation budget": "Odporność vs budżet perturbacji",
  "accuracy under FGSM, 0–1 · dashed line = eval ε":
    "accuracy pod FGSM, 0–1 · linia przerywana = eval ε",
  "defended (adversarially trained)": "defended (adversarially trained)",
  "baseline (undefended)": "baseline (niebroniony)",
  "Same adversarial image, two models": "Ten sam adversarial image, dwa modele",
  "Each perturbation fools the undefended baseline. The defended model is shown the very same image — see whether it still predicts the true class.":
    "Każda perturbacja oszukuje niebroniony baseline. Bronionemu modelowi pokazujemy dokładnie ten sam obraz — zobacz, czy nadal przewiduje prawdziwą klasę.",
  "Adversarial (ε={e})": "Adversarial (ε={e})",
  "baseline reads": "baseline czyta",
  "defended reads": "defended czyta",

  // ---- model extraction + transfer tab ----
  "Model Extraction": "Model Extraction",
  "Transfer attack": "Atak transferowy",
  "query budget": "budżet zapytań",
  "substitute epochs": "epoki substitute",
  "Stealing & attacking…": "Wykradam i atakuję…",
  "Steal & transfer": "Wykradnij i przenieś",
  "Trains several substitutes (one per budget) by querying the target for labels, then crafts adversarial examples on the largest substitute and replays them against the black-box target. Give it ~15–40s.":
    "Trenuje kilka substitute models (po jednym na budżet) odpytując target o labele, a potem tworzy adversarial examples na największym substitute i odtwarza je przeciw czarnoskrzynkowemu targetowi. Daj temu ~15–40s.",
  "1 · Model extraction (stealing)": "1 · Model extraction (wykradanie)",
  "Target accuracy": "Accuracy targetu",
  "Substitute accuracy": "Accuracy substitute",
  "Fidelity (agreement)": "Fidelity (zgodność)",
  "Queries used": "Użyte zapytania",
  "With {q} label-only queries the substitute reproduces the target's outputs {f} of the time — a stolen copy, never having seen the target's weights or training data.":
    "Przy {q} zapytaniach (tylko labele) substitute odtwarza wyjścia targetu w {f} przypadków — wykradziona kopia, która nigdy nie widziała wag ani danych treningowych targetu.",
  "Extraction fidelity vs query budget": "Extraction fidelity vs budżet zapytań",
  "fidelity = substitute/target agreement · x = queries":
    "fidelity = zgodność substitute/target · x = zapytania",
  "2 · Black-box transfer evasion": "2 · Black-box transfer evasion",
  "White-box on substitute": "White-box na substitute",
  "Transfer to target (black-box)": "Transfer na target (black-box)",
  "Direct white-box on target (ref)": "Bezpośredni white-box na target (ref)",
  "Test points attacked": "Zaatakowane próbki test",
  "Adversarial examples crafted on the stolen substitute flip the black-box target {tr} of the time — far above zero, though below the {dir} a direct white-box attack reaches. The attacker never touched the target's gradients.":
    "Adversarial examples stworzone na wykradzionym substitute zmieniają predykcję czarnoskrzynkowego targetu w {tr} przypadków — znacznie powyżej zera, choć poniżej {dir}, które osiąga bezpośredni atak white-box. Atakujący nigdy nie dotknął gradientów targetu.",
  "Transferred examples that fooled the target": "Przeniesione przykłady, które oszukały target",
  "Crafted white-box on the substitute, shown here fooling the black-box target.":
    "Stworzone white-box na substitute, tu pokazane jak oszukują czarnoskrzynkowy target.",
  "target read before": "target czytał wcześniej",
  "target reads now": "target czyta teraz",

  // ---- model inversion tab ----
  "Model Inversion": "Model Inversion",
  "Target class to reconstruct": "Klasa docelowa do rekonstrukcji",
  "optimization steps": "kroki optymalizacji",
  "smoothness (TV)": "gładkość (TV)",
  "Reconstructing…": "Rekonstruuję…",
  "Reconstruct class": "Zrekonstruuj klasę",
  "Optimizes a blank image so the model's internal representation matches its average for the target class — no real image of that class is ever shown to the optimizer. Takes ~3–5s.":
    "Optymalizuje pusty obraz tak, by wewnętrzna reprezentacja modelu odpowiadała jego średniej dla klasy docelowej — żaden prawdziwy obraz tej klasy nie jest nigdy pokazywany optymalizatorowi. Trwa ~3–5s.",
  "Reconstructed “{c}” (from gradients)": "Zrekonstruowane „{c}” (z gradientów)",
  "Real class average ({c})": "Prawdziwa średnia klasy ({c})",
  "Real example ({c})": "Prawdziwy przykład ({c})",
  "Model confidence": "Confidence modelu",
  "Reconstruction read as": "Rekonstrukcja odczytana jako",
  "Nearest class average": "Najbliższa średnia klasy",
  "Target rank (of 10)": "Ranga celu (z 10)",
  "Pure leakage: starting from noise and using only the model's gradients, we reconstructed an image it is {f} sure is a “{c}” — and of all ten class averages it sits closest to “{c}”’s. The model memorized what the class looks like.":
    "Czysty wyciek: startując z szumu i używając tylko gradientów modelu, zrekonstruowaliśmy obraz, którego model jest {f} pewien, że to „{c}” — i ze wszystkich dziesięciu średnich klas leży najbliżej średniej „{c}”. Model zapamiętał, jak wygląda ta klasa.",
  "The model is {f} sure this gradient-built image is a “{c}”. It lands closest to the “{n}” average instead — visually similar classes blur together — but the reconstruction still leaks class structure.":
    "Model jest {f} pewien, że ten zbudowany z gradientów obraz to „{c}”. Trafia jednak najbliżej średniej „{n}” — wizualnie podobne klasy zlewają się — ale rekonstrukcja i tak wycieka strukturę klasy.",
  "Target-class confidence during reconstruction": "Confidence klasy docelowej podczas rekonstrukcji",
  "confidence (0–1) · x = optimization step": "confidence (0–1) · x = krok optymalizacji",

  // ---- indirect / RAG prompt injection (LLM sub-mode) ----
  "Direct attacks": "Ataki bezpośrednie",
  "Indirect (RAG)": "Pośrednie (RAG)",
  "The attacker types directly to the model.": "Atakujący pisze bezpośrednio do modelu.",
  "The attacker poisons a retrieved document; the user is innocent.":
    "Atakujący zatruwa pobierany dokument; użytkownik jest niewinny.",
  "Loading…": "Ładuję…",
  "Indirect Prompt Injection — RAG knowledge base":
    "Pośredni Prompt Injection — baza wiedzy RAG",
  "DocBot answers from a retrieved knowledge base. The attacker can't talk to the bot — but they poisoned a document it retrieves. The user asks an innocent question; the hidden instruction rides in on the data and hijacks the answer — here, injecting a phishing link into a normal reply.":
    "DocBot odpowiada na podstawie pobieranej bazy wiedzy. Atakujący nie może rozmawiać z botem — ale zatruł dokument, który bot pobiera. Użytkownik zadaje niewinne pytanie; ukryta instrukcja wjeżdża wraz z danymi i przejmuje odpowiedź — tutaj wstrzykując link phishingowy do normalnej odpowiedzi.",
  "Assistant system prompt (trusted)": "System prompt asystenta (zaufany)",
  "Retrieved documents (knowledge base)": "Pobrane dokumenty (baza wiedzy)",
  "Pick which document the attacker poisoned. Its hidden instruction is shown in red — the model reads it as part of the data.":
    "Wybierz, który dokument zatruł atakujący. Jego ukryta instrukcja jest na czerwono — model czyta ją jako część danych.",
  Document: "Dokument",
  "Injected instruction (hidden in the poisoned document)":
    "Wstrzyknięta instrukcja (ukryta w zatrutym dokumencie)",
  "User question (benign — the user is not the attacker)":
    "Pytanie użytkownika (niewinne — użytkownik to nie atakujący)",
  "🛡 Defense (treat documents as data + output filter)":
    "🛡 Obrona (traktuj dokumenty jako dane + filtr wyjścia)",
  "Asking DocBot…": "Pytam DocBota…",
  "Ask DocBot": "Zapytaj DocBota",
  "Running on a local CPU model — first reply also loads it (~10–20s).":
    "Liczy lokalny model na CPU — pierwsza odpowiedź dodatkowo go ładuje (~10–20s).",
  "user (benign)": "użytkownik (niewinny)",
  DocBot: "DocBot",
  "🪝 injection obeyed — phishing link delivered":
    "🪝 injection wykonany — link phishingowy dostarczony",
  "🛡 injected but stripped by guardrail":
    "🛡 wstrzyknięty, ale usunięty przez guardrail",

  // ---- supply chain (unsafe deserialization) tab ----
  "Supply Chain": "Supply Chain",
  "Unsafe model deserialization → RCE": "Niebezpieczna deserializacja modelu → RCE",
  "PyTorch checkpoints are pickle files. Loading an untrusted one with the legacy default runs attacker code. This demo crafts such a file locally (with a harmless proof-of-execution payload), loads it the unsafe way, then shows weights_only=True blocking the very same file.":
    "Checkpointy PyTorcha to pliki pickle. Wczytanie niezaufanego ze starym domyślnym ustawieniem uruchamia kod atakującego. To demo tworzy taki plik lokalnie (z nieszkodliwym payloadem dowodzącym wykonania), wczytuje go w niebezpieczny sposób, a potem pokazuje, jak weights_only=True blokuje ten sam plik.",
  "Running demo…": "Uruchamiam demo…",
  "Run the RCE demo": "Uruchom demo RCE",
  "The attacker's payload (hidden in the model file)": "Payload atakującego (ukryty w pliku modelu)",
  "Saved inside a checkpoint that looks completely ordinary:":
    "Zapisany w checkpoincie, który wygląda zupełnie zwyczajnie:",
  bytes: "bajtów",
  "Unsafe load (legacy default)": "Niebezpieczne wczytanie (stary domyślny tryb)",
  "🔥 arbitrary code executed during load": "🔥 podczas wczytywania wykonano dowolny kod",
  "The payload ran and recorded proof — a real attacker could run anything as you:":
    "Payload się wykonał i zapisał dowód — prawdziwy atakujący mógłby uruchomić cokolwiek jako Ty:",
  "payload did not run": "payload się nie wykonał",
  "Safe load (the fix)": "Bezpieczne wczytanie (poprawka)",
  "🛡 blocked — no code executed": "🛡 zablokowane — nie wykonano kodu",
  "⚠ not blocked": "⚠ nie zablokowano",
  Takeaways: "Wnioski",
};
