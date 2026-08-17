(() => {
  "use strict";

  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const OUTPUT_MAX_SIDE = 2200;
  const OUTPUT_QUALITY = 0.88;
  const BUCKET_NAME = "drawings";
  const TABLE_NAME = "submissions";

  const form = document.querySelector("#upload-form");
  const fileInput = document.querySelector("#drawing-file");
  const consentInput = document.querySelector("#parent-consent");
  const submitButton = document.querySelector("#submit-button");
  const statusMessage = document.querySelector("#status-message");
  const previewWrapper = document.querySelector("#preview-wrapper");
  const previewImage = document.querySelector("#image-preview");
  const removeFileButton = document.querySelector("#remove-file");
  const dropZone = document.querySelector("#drop-zone");
  const honeypot = document.querySelector("#website-field");
  const instagramLink = document.querySelector("#instagram-link");
  const contactEmailLink = document.querySelector("#contact-email");
  const mainContent = document.querySelector("#main-content");
  const resultScreen = document.querySelector("#result-screen");
  const resultIcon = document.querySelector("#result-icon");
  const resultEyebrow = document.querySelector("#result-eyebrow");
  const resultTitle = document.querySelector("#result-title");
  const resultMessage = document.querySelector("#result-message");
  const sendAnotherButton = document.querySelector("#send-another-button");
  const resultInstagramLink = document.querySelector("#result-instagram-link");

  let selectedFile = null;
  let previewUrl = null;

  const config = window.APP_CONFIG || {};

  instagramLink.href = config.instagramUrl || "#";
  resultInstagramLink.href = config.instagramUrl || "#";
  contactEmailLink.textContent = config.contactEmail || "INSERISCI_EMAIL";
  contactEmailLink.href = config.contactEmail
    ? `mailto:${config.contactEmail}`
    : "#";

  function setStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`.trim();
  }

  function setBusy(isBusy) {
    submitButton.disabled = isBusy;
    fileInput.disabled = isBusy;
    consentInput.disabled = isBusy;
    submitButton.textContent = isBusy ? "Invio in corso…" : "Invia il disegno";
  }

  function showResultScreen(type, message) {
    const isSuccess = type === "success";

    mainContent.hidden = true;
    resultScreen.hidden = false;
    resultScreen.classList.toggle("is-error", !isSuccess);

    resultIcon.textContent = isSuccess ? "✓" : "!";
    resultEyebrow.textContent = isSuccess ? "INVIO COMPLETATO" : "QUALCOSA È ANDATO STORTO";
    resultTitle.textContent = isSuccess ? "Grazie!" : "Invio non riuscito";
    resultMessage.textContent = message;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showUploadScreen() {
    resultScreen.hidden = true;
    resultScreen.classList.remove("is-error");
    mainContent.hidden = false;

    clearPreview();
    consentInput.checked = false;
    honeypot.value = "";
    setStatus("");
    setBusy(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearPreview() {
    selectedFile = null;
    fileInput.value = "";

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }

    previewImage.removeAttribute("src");
    previewWrapper.hidden = true;
  }

  function showPreview(file) {
    clearPreview();
    selectedFile = file;
    previewUrl = URL.createObjectURL(file);
    previewImage.src = previewUrl;
    previewWrapper.hidden = false;
    setStatus("");
  }

  function validateFile(file) {
    if (!file) {
      throw new Error("Seleziona una foto del disegno.");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("Il file selezionato non sembra essere un’immagine.");
    }

    if (file.size > MAX_FILE_BYTES) {
      throw new Error("L’immagine supera il limite di 15 MB.");
    }
  }

  function getCanvasDimensions(width, height) {
    const longestSide = Math.max(width, height);

    if (longestSide <= OUTPUT_MAX_SIDE) {
      return { width, height };
    }

    const ratio = OUTPUT_MAX_SIDE / longestSide;
    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio)
    };
  }

  async function loadImage(file) {
    if ("createImageBitmap" in window) {
      try {
        return await createImageBitmap(file, {
          imageOrientation: "from-image"
        });
      } catch (_) {
        // Alcuni browser/formati richiedono il fallback seguente.
      }
    }

    return await new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(
          "Non riesco a leggere questa immagine. Prova a convertirla in JPG o PNG."
        ));
      };

      image.src = objectUrl;
    });
  }

  async function prepareImage(file) {
    const image = await loadImage(file);
    const sourceWidth = image.width || image.naturalWidth;
    const sourceHeight = image.height || image.naturalHeight;
    const dimensions = getCanvasDimensions(sourceWidth, sourceHeight);

    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Il browser non permette di preparare l’immagine.");
    }

    // Sfondo bianco: evita aree nere quando un PNG trasparente diventa JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (typeof image.close === "function") {
      image.close();
    }

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", OUTPUT_QUALITY);
    });

    if (!blob) {
      throw new Error("Non è stato possibile preparare il file.");
    }

    return blob;
  }

  function makeRandomPath(userId) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const randomId = crypto.randomUUID();

    return `incoming/${userId}/${year}-${month}/${randomId}.jpg`;
  }

  function getSupabaseClient() {
    const url = config.supabaseUrl;
    const key = config.supabasePublishableKey;

    if (
      !url ||
      !key ||
      url.includes("INSERISCI_") ||
      key.includes("INSERISCI_")
    ) {
      throw new Error(
        "Il sito non è ancora collegato a Supabase. Compila il file config.js."
      );
    }

    if (!window.supabase?.createClient) {
      throw new Error(
        "Non riesco a caricare il servizio di upload. Controlla la connessione e riprova."
      );
    }

    return window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
  }

  async function getAnonymousUser(client) {
    const {
      data: { session }
    } = await client.auth.getSession();

    if (session?.user) {
      return session.user;
    }

    const { data, error } = await client.auth.signInAnonymously();

    if (error || !data?.user) {
      throw new Error(
        "Non è stato possibile inizializzare l’invio anonimo. Riprova tra poco."
      );
    }

    return data.user;
  }

  async function uploadDrawing(file) {
    const client = getSupabaseClient();
    const user = await getAnonymousUser(client);
    const preparedImage = await prepareImage(file);
    const storagePath = makeRandomPath(user.id);

    const { error: uploadError } = await client.storage
      .from(BUCKET_NAME)
      .upload(storagePath, preparedImage, {
        cacheControl: "3600",
        contentType: "image/jpeg",
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Caricamento non riuscito: ${uploadError.message}`);
    }

    const { error: recordError } = await client
      .from(TABLE_NAME)
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        consent_parent: true,
        consent_publication: true,
        processed_client_side: true
      });

    if (recordError) {
      // Il file resta privato nello storage. L'errore viene mostrato per consentire
      // al gestore di verificare manualmente la cartella incoming.
      throw new Error(
        `Immagine caricata, ma registrazione incompleta: ${recordError.message}`
      );
    }
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];

    try {
      validateFile(file);
      showPreview(file);
    } catch (error) {
      clearPreview();
      setStatus(error.message, "error");
    }
  });

  removeFileButton.addEventListener("click", () => {
    clearPreview();
    setStatus("");
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragging");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];

    try {
      validateFile(file);
      showPreview(file);
    } catch (error) {
      clearPreview();
      setStatus(error.message, "error");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    try {
      if (honeypot.value) {
        throw new Error("Invio non valido.");
      }

      validateFile(selectedFile);

      if (!consentInput.checked) {
        throw new Error("È necessario confermare il consenso prima dell’invio.");
      }

      setBusy(true);
      await uploadDrawing(selectedFile);

      clearPreview();
      consentInput.checked = false;

      showResultScreen(
        "success",
        "Il disegno è stato ricevuto e sarà controllato prima di qualsiasi pubblicazione."
      );
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "Si è verificato un errore durante l’invio. Riprova.";

      showResultScreen("error", message);
    } finally {
      setBusy(false);
    }
  });

  sendAnotherButton.addEventListener("click", showUploadScreen);
})();
