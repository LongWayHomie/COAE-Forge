// Beginner-friendly explainers for every dataset, attack family, and variant.
// Shown in the info modal. ML-specific terms are intentionally kept in English in
// the Polish text so they don't sound awkward. Each topic has three sections:
// what it is / how it works / what it results in (rendered as paragraph lists).

export const EXPLAINERS = {
  en: {
    // ---- datasets ----
    mnist: {
      title: "MNIST dataset",
      what: [
        "MNIST is a classic dataset of 70,000 small 28×28 pixel grayscale images of handwritten digits (0–9).",
        "It is the “hello world” of image classification — small and easy, so a model trains in seconds.",
      ],
      how: [
        "Every image comes with a label saying which digit it shows. A model learns to map the pixels to the correct digit.",
        "In this playground MNIST is the target that the attacks try to fool or exploit.",
      ],
      result: [
        "Because MNIST is simple, models reach about 99% accuracy. That makes attacks easy to see: a tiny change that turns a confident “7” into a “3” really stands out.",
      ],
    },
    cifar10: {
      title: "CIFAR-10 dataset",
      what: [
        "CIFAR-10 is a dataset of 60,000 small 32×32 color images in 10 everyday classes (airplane, automobile, bird, cat, deer, dog, frog, horse, ship, truck).",
        "It is harder than MNIST because the images are in color and much more varied.",
      ],
      how: [
        "As with MNIST, the model learns to map pixels to one of the 10 classes; here we use a slightly larger CNN.",
      ],
      result: [
        "Models reach lower accuracy (~70–80%). Because the model generalizes less perfectly, several attacks — especially membership inference — work much more strongly on CIFAR-10.",
      ],
    },

    // ---- adversarial ----
    adversarial: {
      title: "Adversarial examples",
      what: [
        "Adversarial examples are inputs with tiny, often invisible changes added on purpose so the model predicts the wrong thing — while the image still looks normal to a human.",
      ],
      how: [
        "The attacker uses the model's own gradients (the direction that most increases its error) to find the smallest pixel change that pushes the prediction across a decision boundary.",
      ],
      result: [
        "A confidently correct prediction becomes confidently wrong. This is a core security concern for vision models — think of a stop sign being read as a speed-limit sign.",
      ],
    },
    fgsm: {
      title: "FGSM — Fast Gradient Sign Method",
      what: ["FGSM is the simplest adversarial attack: a single step."],
      how: [
        "It computes the gradient of the loss with respect to the input image, then nudges every pixel by a small fixed amount (epsilon) in the direction that increases the loss.",
        "Larger epsilon means a stronger but more visible change.",
      ],
      result: [
        "One quick step often flips the predicted label. The L∞ norm (largest per-pixel change) of the perturbation is exactly epsilon. It is great for understanding the idea, but weaker than iterative attacks.",
      ],
    },
    pgd: {
      title: "PGD — Projected Gradient Descent",
      what: [
        "PGD is the standard strong first-order attack: think of it as FGSM run many times in a row.",
      ],
      how: [
        "It takes many small gradient-sign steps (size alpha). After each step it projects the image back so the total change never exceeds the L∞ budget epsilon, and clamps pixels to valid [0,1] range.",
        "It usually starts from a small random point inside the epsilon-ball, which helps it avoid getting stuck where the gradient is misleading.",
      ],
      result: [
        "Within the same epsilon budget as FGSM, PGD flips far more images and with higher confidence. It is the benchmark attack used to measure and to train robust models (adversarial training).",
      ],
    },
    deepfool: {
      title: "DeepFool",
      what: [
        "DeepFool is an iterative attack that searches for the smallest possible change (measured by L2 distance) that crosses the decision boundary.",
      ],
      how: [
        "It repeatedly approximates the boundary as a flat line and takes a small step just past the nearest one, until the prediction changes.",
      ],
      result: [
        "The perturbation is usually much smaller than FGSM's — close to the minimum change needed to fool the model. It is a good way to measure how robust a model really is.",
      ],
    },
    ead: {
      title: "EAD — Elastic-Net Attack",
      what: ["EAD crafts an adversarial example that changes as few pixels as possible."],
      how: [
        "It minimizes the model's confidence in the true class plus an elastic-net penalty (L1 + L2) on the size of the change. The L1 part encourages sparsity, so only a handful of pixels move.",
        "A binary search over a constant c balances attack strength against distortion.",
      ],
      result: [
        "A sparse perturbation (low L0 — only a few pixels changed) that still flips the label. It shows attacks can be both effective and hard to spot.",
      ],
    },
    jsma: {
      title: "JSMA — Jacobian Saliency Map Attack",
      what: [
        "JSMA is an L0 attack: instead of nudging every pixel a little, it changes as few pixels as possible — but each one a lot.",
      ],
      how: [
        "It computes the Jacobian (how every output class reacts to every input pixel), then builds a saliency map scoring which single pixel most raises the target class while lowering all others. It saturates that pixel and repeats.",
        "A budget gamma caps the fraction of pixels it is allowed to touch; theta is how hard each chosen pixel is pushed.",
      ],
      result: [
        "Only a tiny handful of pixels change (very low L0), yet the label flips. This models sparse, localized tampering — like a few bright stickers on a sign.",
      ],
    },

    // ---- poisoning ----
    poisoning: {
      title: "Data poisoning",
      what: [
        "Data poisoning attacks the model during training, not after. The attacker corrupts the training data so the resulting model misbehaves.",
      ],
      how: [
        "Either by mislabeling examples (label flipping) or by injecting specially crafted but correctly-labeled examples (clean-label).",
      ],
      result: [
        "A model that looks fine but has hidden weaknesses — lower overall accuracy, or a specific input it gets wrong on purpose.",
      ],
    },
    label_flip: {
      title: "Label flipping",
      what: ["Label flipping is the simplest poisoning attack: change the labels on some training examples."],
      how: [
        "Random flips swap a fraction of labels to wrong classes. Targeted flips relabel one class as another (e.g. all 7s labeled as 1s). The model then trains on these wrong labels.",
        "To stay fast, we retrain only a small linear head on top of frozen features, so you see the effect in seconds.",
      ],
      result: [
        "Overall accuracy drops. With targeted flips the model specifically confuses the source class for the target class — a precise, attacker-chosen failure.",
      ],
    },
    clean_label: {
      title: "Clean-label poisoning (Poison Frogs)",
      what: [
        "Clean-label poisoning is sneakier: the poison images keep their correct labels, so they pass human review.",
      ],
      how: [
        "The attacker takes a base-class image and tweaks its pixels so its features (the model's internal representation) collide with a chosen target image, while it still looks like the base class.",
        "Added to training with its honest label, it drags the target's region of feature space toward the base class.",
      ],
      result: [
        "After training, one specific target input is misclassified as the base class — even though every training label was correct. This is very hard to detect.",
      ],
    },

    // ---- membership inference ----
    membership: {
      title: "Membership inference",
      what: [
        "Membership inference asks a privacy question: “was this exact example used to train the model?” Leaking that can be sensitive — imagine confirming a patient was in a medical dataset.",
      ],
      how: [
        "Models tend to be more confident on data they were trained on. The attacker trains shadow models that imitate the target on data with known membership, learns the confidence pattern of members vs non-members, then applies that classifier to the target.",
      ],
      result: [
        "The attacker can guess membership better than chance (AUC above 0.5). It works best when the model overfits — which is exactly what differential privacy (the next tab) defends against.",
      ],
    },

    // ---- differential privacy ----
    privacy: {
      title: "Differential privacy (DP-SGD)",
      what: [
        "Differential privacy is a defense that mathematically limits how much any single training example can influence the model, bounding what attacks can learn about individuals.",
      ],
      how: [
        "DP-SGD changes training: it clips each example's gradient to a maximum norm and adds calibrated Gaussian noise. A privacy budget epsilon (with a small delta) measures the protection — smaller epsilon means more noise and stronger privacy.",
      ],
      result: [
        "A privacy/utility trade-off: a smaller epsilon lowers accuracy but also pulls the membership-inference AUC back toward 0.5 (random guessing). Here you can watch both curves move together.",
      ],
    },

    // ---- defense: adversarial training ----
    defense: {
      title: "Adversarial training (defense)",
      what: [
        "Adversarial training is the strongest known defense against evasion attacks like FGSM and PGD. The model is brittle precisely because it only ever trained on clean images; this fixes that.",
      ],
      how: [
        "During training, every batch is first turned into adversarial examples (here with FGSM or PGD), and the model learns to classify those correctly. Effectively it practises against the attack, pushing its decision boundary away from natural images.",
        "We don't train from scratch — we fine-tune a clone of the pretrained model for a few epochs, then attack both with the same budget to compare.",
      ],
      result: [
        "Clean accuracy barely changes, but the attack success rate drops sharply: the robustness curve shows the defended model staying accurate at perturbation budgets where the baseline collapses. There is still a small clean-accuracy cost — the classic robustness/accuracy trade-off.",
      ],
    },

    // ---- model extraction ----
    extraction: {
      title: "Model extraction (stealing)",
      what: [
        "Model extraction steals a model you can only query. The attacker has no weights and no training data — just an API that returns predictions.",
      ],
      how: [
        "They send many unlabeled inputs, record the target's predicted labels, and train their own 'substitute' model on those (input, label) pairs. Fidelity measures how often the substitute and target agree — and it rises as the query budget grows.",
        "The substitute can use a completely different architecture; it only has to imitate the target's input→output behaviour.",
      ],
      result: [
        "A free local copy of a paid/black-box model — a theft of intellectual property, and (see Transfer) a stepping stone to attacking the original.",
      ],
    },
    transfer: {
      title: "Transfer (black-box) evasion",
      what: [
        "Transfer evasion is how you craft adversarial examples for a model whose gradients you cannot see.",
      ],
      how: [
        "The attacker attacks their own substitute white-box (full gradient access), then replays those exact adversarial images against the black-box target. Because different models trained on similar data learn similar decision boundaries, many perturbations transfer.",
      ],
      result: [
        "A meaningful share of attacks succeed on the target even though it was never directly accessed — lower than a true white-box attack, but far above zero. This is why 'hiding the model' is not a real defense.",
      ],
    },

    // ---- model inversion ----
    inversion: {
      title: "Model inversion",
      what: [
        "Model inversion reconstructs what a class looks like straight out of a trained model — a privacy attack, because for a model trained on faces it can rebuild a recognisable likeness of a person in the training set.",
      ],
      how: [
        "Start from a blank/noisy image and run gradient ascent so the model's internal representation matches its average response for the target class. Image priors — total variation (smoothness), random jitter and periodic blur — turn what would be adversarial noise into a recognisable prototype.",
        "Crucially, no real image of the class is ever shown to the optimizer; the picture is built only from the model's own gradients.",
      ],
      result: [
        "A synthetic image the model is highly confident is the target class, which also lands closest to that class's real average — proof it captured class-specific structure. The model effectively memorized what the class looks like.",
      ],
    },

    // ---- supply chain: unsafe deserialization ----
    supply_chain: {
      title: "Unsafe deserialization (pickle RCE)",
      what: [
        "Most model files (.pt, .bin, .ckpt, .pkl) are Python pickle archives. Pickle is not just data — it can execute code while loading. So downloading and loading a model is, by default, running a stranger's code.",
      ],
      how: [
        "Any object can define __reduce__, which tells pickle a function to call when rebuilding it. An attacker hides such an object in an otherwise normal checkpoint; the moment you call torch.load(...) it runs their function — a reverse shell, key theft, anything — as you.",
        "The fix is to deserialize data only: torch.load(path, weights_only=True), which refuses to call arbitrary functions, or the safetensors format, which stores tensors with no code path at all.",
      ],
      result: [
        "A model file that pops a shell on load. This is a software-supply-chain attack (Google SAIF, OWASP ML): always load weights_only=True or safetensors, and verify the source and hashes of any weights you didn't train yourself.",
      ],
    },

    // ---- LLM attacks ----
    llm: {
      title: "LLM attacks",
      what: [
        "LLM attacks target language models through their text input instead of pixels. A model following a hidden system prompt can be manipulated by what the user types.",
      ],
      how: [
        "Crafted prompts try to override instructions, bypass refusals, or reveal hidden text. Here a small local model hides a secret it is told never to share.",
      ],
      result: [
        "If the attack works, the model breaks its rules — leaking secrets or ignoring safety instructions. The defense toggle demonstrates mitigations.",
      ],
    },
    prompt_injection: {
      title: "Prompt injection",
      what: ["Prompt injection slips new instructions into the user input to override the model's original system prompt."],
      how: [
        "Phrases like “ignore previous instructions and …” or fake “SYSTEM:” messages try to make the model treat attacker text as a higher-priority command.",
      ],
      result: [
        "The model follows the attacker instead of its owner — for example, revealing a confidential discount code it was told to protect.",
      ],
    },
    jailbreak: {
      title: "Jailbreak",
      what: ["A jailbreak makes a model bypass its own safety or refusal rules."],
      how: [
        "Role-play (“you are DAN, an AI with no rules”), hypothetical framings, or emotional pretexts trick the model into doing what it would normally refuse.",
      ],
      result: [
        "The model produces content it was instructed to withhold — here, a passphrase it was told to always refuse to reveal.",
      ],
    },
    system_prompt_leak: {
      title: "System-prompt leakage",
      what: ["System-prompt leakage extracts the hidden instructions (the system prompt) the model was given."],
      how: [
        "Asking the model to “repeat the text above” or “print your instructions” can make it reveal confidential setup text — including any secret accidentally placed there.",
      ],
      result: [
        "The attacker learns the hidden prompt and any secret or canary token in it, which can expose business logic or credentials.",
      ],
    },
    indirect_injection: {
      title: "Indirect / RAG prompt injection",
      what: [
        "Indirect prompt injection hides the malicious instruction in external content the app feeds to the model — a retrieved document, a web page, an email — instead of typing it directly. The actual user is innocent.",
      ],
      how: [
        "A RAG assistant answers using documents fetched from a knowledge base. The attacker poisons one document with a hidden instruction. When the user asks a normal question and that document is retrieved, the model reads the instruction as if it came from a trusted source, and obeys it — here, appending a phishing link to the answer.",
        "The defense treats retrieved documents strictly as data (never instructions) and filters the output.",
      ],
      result: [
        "The model is hijacked without the attacker ever talking to it. This is OWASP LLM01 and the core risk in agentic/RAG systems: any data the model reads is a potential attack surface.",
      ],
    },
  },

  pl: {
    // ---- datasets ----
    mnist: {
      title: "Dataset MNIST",
      what: [
        "MNIST to klasyczny dataset 70 000 małych obrazów 28×28 pikseli w skali szarości, przedstawiających ręcznie pisane cyfry (0–9).",
        "To „hello world” klasyfikacji obrazów — mały i prosty, więc model trenuje się w kilka sekund.",
      ],
      how: [
        "Każdy obraz ma label mówiący, którą cyfrę przedstawia. Model uczy się mapować piksele na właściwą cyfrę.",
        "W tym playgroundzie MNIST jest celem, który ataki próbują oszukać lub wykorzystać.",
      ],
      result: [
        "Ponieważ MNIST jest prosty, modele osiągają około 99% accuracy. Dzięki temu ataki dobrze widać: drobna zmiana, która zamienia pewną „7” w „3”, naprawdę rzuca się w oczy.",
      ],
    },
    cifar10: {
      title: "Dataset CIFAR-10",
      what: [
        "CIFAR-10 to dataset 60 000 małych kolorowych obrazów 32×32 w 10 codziennych klasach (samolot, samochód, ptak, kot, jeleń, pies, żaba, koń, statek, ciężarówka).",
        "Jest trudniejszy od MNIST, bo obrazy są kolorowe i dużo bardziej zróżnicowane.",
      ],
      how: [
        "Tak jak przy MNIST, model uczy się mapować piksele na jedną z 10 klas; tutaj używamy nieco większego CNN.",
      ],
      result: [
        "Modele osiągają niższe accuracy (~70–80%). Ponieważ model gorzej generalizuje, kilka ataków — zwłaszcza membership inference — działa na CIFAR-10 znacznie silniej.",
      ],
    },

    // ---- adversarial ----
    adversarial: {
      title: "Adversarial examples",
      what: [
        "Adversarial examples to wejścia z drobnymi, często niewidocznymi zmianami dodanymi celowo, by model przewidział coś błędnego — podczas gdy obraz dla człowieka wciąż wygląda normalnie.",
      ],
      how: [
        "Atakujący wykorzystuje gradienty samego modelu (kierunek, który najbardziej zwiększa jego błąd), aby znaleźć najmniejszą zmianę pikseli przesuwającą predykcję przez decision boundary.",
      ],
      result: [
        "Pewna, poprawna predykcja staje się pewną, ale błędną. To kluczowy problem bezpieczeństwa modeli wizyjnych — wyobraź sobie znak STOP odczytany jako znak ograniczenia prędkości.",
      ],
    },
    fgsm: {
      title: "FGSM — Fast Gradient Sign Method",
      what: ["FGSM to najprostszy adversarial attack: pojedynczy krok."],
      how: [
        "Liczy gradient funkcji loss względem obrazu wejściowego, a następnie przesuwa każdy piksel o małą stałą wartość (epsilon) w kierunku, który zwiększa loss.",
        "Większy epsilon oznacza silniejszą, ale bardziej widoczną zmianę.",
      ],
      result: [
        "Jeden szybki krok często zmienia przewidziany label. Norma L∞ (największa zmiana pojedynczego piksela) perturbacji jest dokładnie równa epsilon. Świetny do zrozumienia idei, ale słabszy niż ataki iteracyjne.",
      ],
    },
    pgd: {
      title: "PGD — Projected Gradient Descent",
      what: [
        "PGD to standardowy silny atak pierwszego rzędu: można o nim myśleć jak o FGSM uruchomionym wiele razy pod rząd.",
      ],
      how: [
        "Robi wiele małych kroków po znaku gradientu (rozmiar alpha). Po każdym kroku rzutuje obraz z powrotem tak, by łączna zmiana nigdy nie przekroczyła budżetu L∞ epsilon, i przycina piksele do zakresu [0,1].",
        "Zwykle startuje z małego losowego punktu wewnątrz kuli epsilon, co pomaga uniknąć utknięcia tam, gdzie gradient jest mylący.",
      ],
      result: [
        "W tym samym budżecie epsilon co FGSM, PGD zmienia label znacznie częściej i z wyższym confidence. To benchmarkowy atak używany do pomiaru i do trenowania odpornych modeli (adversarial training).",
      ],
    },
    deepfool: {
      title: "DeepFool",
      what: [
        "DeepFool to atak iteracyjny, który szuka najmniejszej możliwej zmiany (mierzonej dystansem L2) przekraczającej decision boundary.",
      ],
      how: [
        "Wielokrotnie przybliża granicę jako płaską linię i robi mały krok tuż za najbliższą z nich, aż predykcja się zmieni.",
      ],
      result: [
        "Perturbacja jest zwykle dużo mniejsza niż w FGSM — bliska minimalnej zmianie potrzebnej do oszukania modelu. To dobry sposób na zmierzenie, jak naprawdę odporny jest model.",
      ],
    },
    ead: {
      title: "EAD — Elastic-Net Attack",
      what: ["EAD tworzy adversarial example, który zmienia jak najmniej pikseli."],
      how: [
        "Minimalizuje confidence modelu w prawdziwej klasie plus penalty elastic-net (L1 + L2) na wielkość zmiany. Część L1 promuje sparsity, więc rusza się tylko garstka pikseli.",
        "Binary search po stałej c równoważy siłę ataku i wielkość zniekształcenia.",
      ],
      result: [
        "Rzadka perturbacja (niskie L0 — zmieniono tylko kilka pikseli), która i tak zmienia label. Pokazuje, że ataki mogą być zarazem skuteczne i trudne do zauważenia.",
      ],
    },
    jsma: {
      title: "JSMA — Jacobian Saliency Map Attack",
      what: [
        "JSMA to atak L0: zamiast leciutko ruszać każdy piksel, zmienia jak najmniej pikseli — ale każdy z nich mocno.",
      ],
      how: [
        "Liczy jakobian (jak każda klasa wyjściowa reaguje na każdy piksel wejścia), a potem buduje saliency map oceniającą, który pojedynczy piksel najbardziej podnosi klasę docelową, obniżając wszystkie inne. Saturuje ten piksel i powtarza.",
        "Budżet gamma ogranicza ułamek pikseli, których wolno mu dotknąć; theta to siła, z jaką popychany jest każdy wybrany piksel.",
      ],
      result: [
        "Zmienia się tylko garstka pikseli (bardzo niskie L0), a mimo to label się zmienia. Modeluje to rzadką, lokalną ingerencję — jak kilka jasnych naklejek na znaku.",
      ],
    },

    // ---- poisoning ----
    poisoning: {
      title: "Data poisoning",
      what: [
        "Data poisoning atakuje model podczas treningu, a nie po nim. Atakujący psuje dane treningowe tak, by powstały model działał źle.",
      ],
      how: [
        "Albo przez błędne etykietowanie przykładów (label flipping), albo przez wstrzyknięcie specjalnie spreparowanych, ale poprawnie oznaczonych przykładów (clean-label).",
      ],
      result: [
        "Model, który wygląda dobrze, ale ma ukryte słabości — niższe ogólne accuracy lub konkretne wejście, które celowo myli.",
      ],
    },
    label_flip: {
      title: "Label flipping",
      what: ["Label flipping to najprostszy atak poisoning: zmiana labeli na części przykładów treningowych."],
      how: [
        "Random flips zamieniają część labeli na błędne klasy. Targeted flips zmieniają jedną klasę w inną (np. wszystkie 7 oznaczone jako 1). Model trenuje się potem na tych błędnych labelach.",
        "Aby było szybko, dotrenowujemy tylko mały linear head na zamrożonych features, więc efekt widać w kilka sekund.",
      ],
      result: [
        "Ogólne accuracy spada. Przy targeted flips model konkretnie myli klasę źródłową z docelową — precyzyjna, wybrana przez atakującego porażka.",
      ],
    },
    clean_label: {
      title: "Clean-label poisoning (Poison Frogs)",
      what: [
        "Clean-label poisoning jest sprytniejszy: obrazy-trucizny zachowują poprawne labele, więc przechodzą kontrolę człowieka.",
      ],
      how: [
        "Atakujący bierze obraz klasy bazowej i modyfikuje jego piksele tak, by jego features (wewnętrzna reprezentacja modelu) zderzyły się z wybranym obrazem-celem, podczas gdy wciąż wygląda jak klasa bazowa.",
        "Dodany do treningu z uczciwym labelem, przeciąga obszar feature space wokół celu w stronę klasy bazowej.",
      ],
      result: [
        "Po treningu jedno konkretne wejście-cel jest klasyfikowane jako klasa bazowa — mimo że każdy label treningowy był poprawny. To bardzo trudne do wykrycia.",
      ],
    },

    // ---- membership inference ----
    membership: {
      title: "Membership inference",
      what: [
        "Membership inference zadaje pytanie o prywatność: „czy ten konkretny przykład był użyty do treningu modelu?”. Wyciek tej informacji bywa wrażliwy — wyobraź sobie potwierdzenie, że pacjent był w medycznym datasecie.",
      ],
      how: [
        "Modele są zwykle bardziej pewne na danych, na których je trenowano. Atakujący trenuje shadow models naśladujące cel na danych o znanej przynależności, uczy się wzorca confidence dla members vs non-members, a potem stosuje ten klasyfikator do celu.",
      ],
      result: [
        "Atakujący zgaduje przynależność lepiej niż losowo (AUC powyżej 0.5). Działa najlepiej, gdy model się przeucza (overfitting) — przed czym broni właśnie differential privacy (następna zakładka).",
      ],
    },

    // ---- differential privacy ----
    privacy: {
      title: "Differential privacy (DP-SGD)",
      what: [
        "Differential privacy to obrona, która matematycznie ogranicza, jak bardzo pojedynczy przykład treningowy może wpłynąć na model, ograniczając to, czego ataki mogą się dowiedzieć o jednostkach.",
      ],
      how: [
        "DP-SGD zmienia trening: przycina (clipping) gradient każdego przykładu do maksymalnej normy i dodaje skalibrowany szum Gaussa. Budżet prywatności epsilon (z małym delta) mierzy ochronę — mniejszy epsilon oznacza więcej szumu i silniejszą prywatność.",
      ],
      result: [
        "Kompromis prywatność/użyteczność: mniejszy epsilon obniża accuracy, ale też ściąga AUC membership inference z powrotem ku 0.5 (zgadywanie losowe). Tutaj widać, jak obie krzywe poruszają się razem.",
      ],
    },

    // ---- defense: adversarial training ----
    defense: {
      title: "Adversarial training (obrona)",
      what: [
        "Adversarial training to najsilniejsza znana obrona przed atakami evasion jak FGSM i PGD. Model jest kruchy właśnie dlatego, że trenował tylko na czystych obrazach; to naprawia ten problem.",
      ],
      how: [
        "Podczas treningu każdy batch jest najpierw zamieniany na adversarial examples (tu przez FGSM lub PGD), a model uczy się klasyfikować je poprawnie. W praktyce ćwiczy przeciw atakowi, odsuwając swój decision boundary od naturalnych obrazów.",
        "Nie trenujemy od zera — dotrenowujemy klon pretrenowanego modelu przez kilka epok, a potem atakujemy oba tym samym budżetem, by je porównać.",
      ],
      result: [
        "Clean accuracy prawie się nie zmienia, ale attack success rate gwałtownie spada: krzywa odporności pokazuje, że broniony model pozostaje dokładny przy budżetach perturbacji, przy których baseline się załamuje. Pozostaje mały koszt clean accuracy — klasyczny trade-off odporność/dokładność.",
      ],
    },

    // ---- model extraction ----
    extraction: {
      title: "Model extraction (wykradanie)",
      what: [
        "Model extraction wykrada model, który możesz tylko odpytywać. Atakujący nie ma wag ani danych treningowych — tylko API zwracające predykcje.",
      ],
      how: [
        "Wysyła wiele nieoznaczonych wejść, zapisuje predykowane labele targetu i trenuje własny model 'substitute' na tych parach (wejście, label). Fidelity mierzy, jak często substitute i target się zgadzają — i rośnie wraz z budżetem zapytań.",
        "Substitute może mieć zupełnie inną architekturę; musi tylko naśladować zachowanie wejście→wyjście targetu.",
      ],
      result: [
        "Darmowa lokalna kopia płatnego/czarnoskrzynkowego modelu — kradzież własności intelektualnej oraz (patrz Transfer) odskocznia do ataku na oryginał.",
      ],
    },
    transfer: {
      title: "Transfer (black-box) evasion",
      what: [
        "Transfer evasion to sposób tworzenia adversarial examples dla modelu, którego gradientów nie widzisz.",
      ],
      how: [
        "Atakujący atakuje własny substitute white-box (pełny dostęp do gradientów), a potem odtwarza dokładnie te adversarial images przeciw czarnoskrzynkowemu targetowi. Ponieważ różne modele trenowane na podobnych danych uczą się podobnych decision boundaries, wiele perturbacji się przenosi.",
      ],
      result: [
        "Znaczna część ataków udaje się na targecie, mimo że nigdy nie był bezpośrednio dostępny — mniej niż prawdziwy atak white-box, ale znacznie powyżej zera. Dlatego 'ukrycie modelu' nie jest prawdziwą obroną.",
      ],
    },

    // ---- model inversion ----
    inversion: {
      title: "Model inversion",
      what: [
        "Model inversion rekonstruuje wygląd klasy wprost z wytrenowanego modelu — to atak na prywatność, bo dla modelu trenowanego na twarzach potrafi odtworzyć rozpoznawalną podobiznę osoby ze zbioru treningowego.",
      ],
      how: [
        "Startuje od pustego/zaszumionego obrazu i prowadzi gradient ascent tak, by wewnętrzna reprezentacja modelu odpowiadała jego średniej odpowiedzi dla klasy docelowej. Priory obrazu — total variation (gładkość), losowy jitter i okresowy blur — zamieniają to, co byłoby adversarial noise, w rozpoznawalny prototyp.",
        "Co kluczowe, żaden prawdziwy obraz klasy nie jest nigdy pokazywany optymalizatorowi; obraz powstaje wyłącznie z gradientów samego modelu.",
      ],
      result: [
        "Syntetyczny obraz, którego model jest mocno pewien, że to klasa docelowa, i który zarazem leży najbliżej prawdziwej średniej tej klasy — dowód, że uchwycił strukturę specyficzną dla klasy. Model w praktyce zapamiętał, jak klasa wygląda.",
      ],
    },

    // ---- supply chain: unsafe deserialization ----
    supply_chain: {
      title: "Unsafe deserialization (pickle RCE)",
      what: [
        "Większość plików modeli (.pt, .bin, .ckpt, .pkl) to archiwa pickle Pythona. Pickle to nie tylko dane — potrafi wykonać kod podczas wczytywania. Więc pobranie i wczytanie modelu to domyślnie uruchomienie kodu obcej osoby.",
      ],
      how: [
        "Każdy obiekt może zdefiniować __reduce__, które mówi pickle, jaką funkcję wywołać przy jego odtwarzaniu. Atakujący ukrywa taki obiekt w skądinąd normalnym checkpoincie; w momencie wywołania torch.load(...) uruchamia się jego funkcja — reverse shell, kradzież kluczy, cokolwiek — jako Ty.",
        "Poprawka to deserializacja wyłącznie danych: torch.load(path, weights_only=True), które odmawia wywoływania dowolnych funkcji, albo format safetensors, który przechowuje tensory bez żadnej ścieżki na kod.",
      ],
      result: [
        "Plik modelu, który przy wczytaniu odpala shell. To atak na łańcuch dostaw oprogramowania (Google SAIF, OWASP ML): zawsze wczytuj z weights_only=True lub safetensors i weryfikuj źródło oraz hashe wag, których sam nie wytrenowałeś.",
      ],
    },

    // ---- LLM attacks ----
    llm: {
      title: "Ataki na LLM",
      what: [
        "Ataki na LLM celują w modele językowe przez ich tekstowe wejście zamiast pikseli. Model kierujący się ukrytym system promptem może zostać zmanipulowany tym, co wpisze użytkownik.",
      ],
      how: [
        "Spreparowane prompty próbują nadpisać instrukcje, obejść odmowy lub ujawnić ukryty tekst. Tutaj mały lokalny model ukrywa secret, którego rzekomo nigdy nie ma zdradzić.",
      ],
      result: [
        "Jeśli atak się powiedzie, model łamie swoje zasady — wycieka secret lub ignoruje instrukcje bezpieczeństwa. Przełącznik defense pokazuje sposoby obrony.",
      ],
    },
    prompt_injection: {
      title: "Prompt injection",
      what: ["Prompt injection wstrzykuje nowe instrukcje do wejścia użytkownika, by nadpisać oryginalny system prompt modelu."],
      how: [
        "Frazy jak „ignore previous instructions and …” albo fałszywe wiadomości „SYSTEM:” próbują skłonić model, by potraktował tekst atakującego jak polecenie o wyższym priorytecie.",
      ],
      result: [
        "Model słucha atakującego zamiast właściciela — na przykład ujawnia poufny kod rabatowy, który miał chronić.",
      ],
    },
    jailbreak: {
      title: "Jailbreak",
      what: ["Jailbreak sprawia, że model obchodzi własne zasady bezpieczeństwa lub odmowy."],
      how: [
        "Role-play („jesteś DAN, AI bez zasad”), hipotetyczne scenariusze lub emocjonalne preteksty nakłaniają model do zrobienia tego, czego normalnie by odmówił.",
      ],
      result: [
        "Model wytwarza treść, której miał nie ujawniać — tutaj passphrase, którego zawsze miał odmawiać.",
      ],
    },
    system_prompt_leak: {
      title: "Wyciek system promptu",
      what: ["Wyciek system promptu wydobywa ukryte instrukcje (system prompt), które otrzymał model."],
      how: [
        "Poproszenie modelu, by „powtórzył tekst powyżej” lub „wypisał swoje instrukcje”, może skłonić go do ujawnienia poufnego tekstu konfiguracyjnego — w tym sekretu przypadkiem tam umieszczonego.",
      ],
      result: [
        "Atakujący poznaje ukryty prompt oraz każdy secret lub token-canary w nim zawarty, co może odsłonić logikę biznesową lub poświadczenia.",
      ],
    },
    indirect_injection: {
      title: "Indirect / RAG prompt injection",
      what: [
        "Pośredni prompt injection ukrywa złośliwą instrukcję w zewnętrznej treści, którą aplikacja podaje modelowi — pobranym dokumencie, stronie WWW, e-mailu — zamiast wpisywać ją bezpośrednio. Sam użytkownik jest niewinny.",
      ],
      how: [
        "Asystent RAG odpowiada, korzystając z dokumentów pobranych z bazy wiedzy. Atakujący zatruwa jeden dokument ukrytą instrukcją. Gdy użytkownik zadaje normalne pytanie i ten dokument zostaje pobrany, model czyta instrukcję tak, jakby pochodziła z zaufanego źródła, i wykonuje ją — tutaj dopisując link phishingowy do odpowiedzi.",
        "Obrona traktuje pobrane dokumenty wyłącznie jako dane (nigdy instrukcje) i filtruje wyjście.",
      ],
      result: [
        "Model zostaje przejęty, choć atakujący nigdy z nim nie rozmawiał. To OWASP LLM01 i kluczowe ryzyko w systemach agentic/RAG: każde dane, które model czyta, to potencjalna powierzchnia ataku.",
      ],
    },
  },
};
