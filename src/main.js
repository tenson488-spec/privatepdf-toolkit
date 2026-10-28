import "./style.css";
import { PDFDocument, degrees } from "pdf-lib";

const app = document.querySelector("#app");

const tools = [
  { id: "merge", icon: "🔗", title: "Merge PDF", description: "Combine multiple PDF files into one." },
  { id: "split", icon: "✂️", title: "Extract Pages", description: "Create a new PDF from selected pages." },
  { id: "rotate", icon: "↻", title: "Rotate PDF", description: "Rotate every page in a PDF." },
  { id: "delete", icon: "🗑️", title: "Delete Pages", description: "Remove unwanted pages from a PDF." },
  { id: "reorder", icon: "↕️", title: "Reorder Pages", description: "Create a PDF using a new page order." },
  { id: "images", icon: "🖼️", title: "Images to PDF", description: "Convert JPG and PNG images into a PDF." },
];

renderHome();

app.addEventListener("click", (event) => {
  const homeButton = event.target.closest("[data-action='home']");
  if (homeButton) {
    renderHome();
    return;
  }

  const toolButton = event.target.closest("[data-tool]");
  if (toolButton) {
    renderTool(toolButton.dataset.tool);
  }
});

function navbar() {
  return `
    <header class="navbar">
      <button class="brand" data-action="home" type="button">
        <span class="brand-mark">P</span>
        <span>PrivatePDF</span>
      </button>
      <button class="nav-home" data-action="home" type="button">Home</button>
    </header>
  `;
}

function renderHome() {
  app.innerHTML = `
    ${navbar()}
    <main class="page">
      <section class="hero">
        <span class="eyebrow">LOCAL BROWSER PROCESSING</span>
        <h1>Useful PDF tools without uploading your files</h1>
        <p>
          Merge, extract, rotate and organize PDF documents directly on your device.
          No account, server upload or cloud storage is required.
        </p>
        <div class="trust-row">
          <span>✓ Files stay on your device</span>
          <span>✓ No account required</span>
          <span>✓ Free browser tools</span>
        </div>
      </section>

      <section>
        <div class="section-heading">
          <h2>PDF tools</h2>
          <p>Select a tool to begin.</p>
        </div>

        <div class="tool-grid">
          ${tools.map((tool) => `
            <button class="tool-card" data-tool="${tool.id}" type="button">
              <span class="tool-icon">${tool.icon}</span>
              <span>
                <strong>${tool.title}</strong>
                <small>${tool.description}</small>
              </span>
              <span class="arrow">→</span>
            </button>
          `).join("")}
        </div>
      </section>

      <section class="privacy-panel">
        <div>
          <h2>Designed for privacy</h2>
          <p>
            PDF processing happens in your browser memory. This website does not
            send your selected documents to a processing server.
          </p>
        </div>
      </section>
    </main>

    <footer>
      <p>PrivatePDF · Browser-based PDF utilities</p>

      <nav aria-label="Footer navigation">
  <a href="/about.html">About</a>
  <a href="/contact.html">Contact</a>
  <a href="/privacy.html">Privacy Policy</a>
</nav>

    </footer>
  `;
}

function renderTool(toolId) {
  const renderers = {
    merge: renderMerge,
    split: renderSplit,
    rotate: renderRotate,
    delete: renderDelete,
    reorder: renderReorder,
    images: renderImages,
  };

  const renderer = renderers[toolId];
  if (renderer) renderer();
}

function toolShell(title, description, controls) {
  app.innerHTML = `
    ${navbar()}
    <main class="page tool-page">
      <button class="back-link" data-action="home" type="button">← All tools</button>

      <section class="tool-header">
        <h1>${title}</h1>
        <p>${description}</p>
      </section>

      <section class="workspace">
        ${controls}
        <p class="status" id="status" role="status"></p>
      </section>

      <p class="local-note">🔒 Files are processed locally and are not uploaded.</p>
    </main>
  `;
}

function uploadMarkup({ id, accept, multiple = false, label }) {
  return `
    <label class="upload-zone" for="${id}">
      <span class="upload-icon">＋</span>
      <strong>${label}</strong>
      <span>Click here to select files</span>
    </label>
    <input
      id="${id}"
      class="hidden-input"
      type="file"
      accept="${accept}"
      ${multiple ? "multiple" : ""}
    />
    <div class="selected-files" id="selected-files"></div>
  `;
}

function renderMerge() {
  toolShell(
    "Merge PDF",
    "Combine two or more PDFs in the order selected.",
    `
      ${uploadMarkup({
        id: "merge-files",
        accept: "application/pdf",
        multiple: true,
        label: "Choose PDF files",
      })}
      <button class="primary-button" id="run-merge" type="button" disabled>
        Merge PDFs
      </button>
    `
  );

  const input = document.querySelector("#merge-files");
  const button = document.querySelector("#run-merge");

  input.addEventListener("change", () => {
    const files = validPdfFiles(input.files);
    showFiles(files);
    button.disabled = files.length < 2;
    setStatus(files.length === 1 ? "Select at least one more PDF." : "");
  });

  button.addEventListener("click", async () => {
    const files = validPdfFiles(input.files);
    await runTask(button, "Merging PDFs…", async () => {
      const output = await PDFDocument.create();

      for (const file of files) {
        const source = await loadPdf(file);
        const pages = await output.copyPages(source, source.getPageIndices());
        pages.forEach((page) => output.addPage(page));
      }

      downloadBytes(await output.save(), "merged.pdf");
    });
  });
}

function renderSplit() {
  toolShell(
    "Extract Pages",
    "Enter the pages you want in the new PDF, such as 1-3, 6, 9.",
    `
      ${uploadMarkup({
        id: "split-file",
        accept: "application/pdf",
        label: "Choose one PDF",
      })}
      <label class="field">
        <span>Pages to extract</span>
        <input id="split-pages" type="text" placeholder="Example: 1-3, 6, 9" />
      </label>
      <button class="primary-button" id="run-split" type="button" disabled>
        Extract Pages
      </button>
    `
  );

  const input = document.querySelector("#split-file");
  const pagesInput = document.querySelector("#split-pages");
  const button = document.querySelector("#run-split");

  const update = () => {
    const files = validPdfFiles(input.files);
    showFiles(files);
    button.disabled = files.length !== 1 || !pagesInput.value.trim();
  };

  input.addEventListener("change", update);
  pagesInput.addEventListener("input", update);

  button.addEventListener("click", async () => {
    const file = validPdfFiles(input.files)[0];

    await runTask(button, "Extracting pages…", async () => {
      const source = await loadPdf(file);
      const indices = parsePageSelection(pagesInput.value, source.getPageCount());

      if (!indices.length) {
        throw new Error("Enter at least one valid page number.");
      }

      const output = await PDFDocument.create();
      const pages = await output.copyPages(source, indices);
      pages.forEach((page) => output.addPage(page));

      downloadBytes(await output.save(), "extracted-pages.pdf");
    });
  });
}

function renderRotate() {
  toolShell(
    "Rotate PDF",
    "Rotate every page clockwise or counterclockwise.",
    `
      ${uploadMarkup({
        id: "rotate-file",
        accept: "application/pdf",
        label: "Choose one PDF",
      })}
      <label class="field">
        <span>Rotation</span>
        <select id="rotation-angle">
          <option value="90">90° clockwise</option>
          <option value="-90">90° counterclockwise</option>
          <option value="180">180°</option>
        </select>
      </label>
      <button class="primary-button" id="run-rotate" type="button" disabled>
        Rotate PDF
      </button>
    `
  );

  const input = document.querySelector("#rotate-file");
  const button = document.querySelector("#run-rotate");
  const angle = document.querySelector("#rotation-angle");

  input.addEventListener("change", () => {
    const files = validPdfFiles(input.files);
    showFiles(files);
    button.disabled = files.length !== 1;
  });

  button.addEventListener("click", async () => {
    const file = validPdfFiles(input.files)[0];

    await runTask(button, "Rotating pages…", async () => {
      const pdf = await loadPdf(file);
      const adjustment = Number(angle.value);

      pdf.getPages().forEach((page) => {
        const current = page.getRotation().angle;
        const next = ((current + adjustment) % 360 + 360) % 360;
        page.setRotation(degrees(next));
      });

      downloadBytes(await pdf.save(), "rotated.pdf");
    });
  });
}

function renderDelete() {
  toolShell(
    "Delete Pages",
    "Enter the pages to remove, such as 2, 5-7.",
    `
      ${uploadMarkup({
        id: "delete-file",
        accept: "application/pdf",
        label: "Choose one PDF",
      })}
      <label class="field">
        <span>Pages to delete</span>
        <input id="delete-pages" type="text" placeholder="Example: 2, 5-7" />
      </label>
      <button class="primary-button" id="run-delete" type="button" disabled>
        Delete Pages
      </button>
    `
  );

  const input = document.querySelector("#delete-file");
  const pagesInput = document.querySelector("#delete-pages");
  const button = document.querySelector("#run-delete");

  const update = () => {
    const files = validPdfFiles(input.files);
    showFiles(files);
    button.disabled = files.length !== 1 || !pagesInput.value.trim();
  };

  input.addEventListener("change", update);
  pagesInput.addEventListener("input", update);

  button.addEventListener("click", async () => {
    const file = validPdfFiles(input.files)[0];

    await runTask(button, "Deleting pages…", async () => {
      const pdf = await loadPdf(file);
      const count = pdf.getPageCount();
      const indices = parsePageSelection(pagesInput.value, count);

      if (!indices.length) {
        throw new Error("Enter at least one valid page number.");
      }

      if (indices.length >= count) {
        throw new Error("A PDF must contain at least one page.");
      }

      [...indices]
        .sort((a, b) => b - a)
        .forEach((index) => pdf.removePage(index));

      downloadBytes(await pdf.save(), "pages-deleted.pdf");
    });
  });
}

function renderReorder() {
  toolShell(
    "Reorder Pages",
    "Enter the complete new page order, such as 3, 1, 2, 4.",
    `
      ${uploadMarkup({
        id: "reorder-file",
        accept: "application/pdf",
        label: "Choose one PDF",
      })}
      <label class="field">
        <span>New page order</span>
        <input id="page-order" type="text" placeholder="Example: 3, 1, 2, 4" />
      </label>
      <button class="primary-button" id="run-reorder" type="button" disabled>
        Reorder Pages
      </button>
    `
  );

  const input = document.querySelector("#reorder-file");
  const orderInput = document.querySelector("#page-order");
  const button = document.querySelector("#run-reorder");

  const update = () => {
    const files = validPdfFiles(input.files);
    showFiles(files);
    button.disabled = files.length !== 1 || !orderInput.value.trim();
  };

  input.addEventListener("change", update);
  orderInput.addEventListener("input", update);

  button.addEventListener("click", async () => {
    const file = validPdfFiles(input.files)[0];

    await runTask(button, "Reordering pages…", async () => {
      const source = await loadPdf(file);
      const count = source.getPageCount();
      const indices = parseExplicitOrder(orderInput.value, count);

      if (indices.length !== count || new Set(indices).size !== count) {
        throw new Error(`Enter every page exactly once. This PDF has ${count} pages.`);
      }

      const output = await PDFDocument.create();
      const pages = await output.copyPages(source, indices);
      pages.forEach((page) => output.addPage(page));

      downloadBytes(await output.save(), "reordered.pdf");
    });
  });
}

function renderImages() {
  toolShell(
    "Images to PDF",
    "Create one PDF page for each selected JPG or PNG image.",
    `
      ${uploadMarkup({
        id: "image-files",
        accept: "image/jpeg,image/png",
        multiple: true,
        label: "Choose JPG or PNG images",
      })}
      <button class="primary-button" id="run-images" type="button" disabled>
        Create PDF
      </button>
    `
  );

  const input = document.querySelector("#image-files");
  const button = document.querySelector("#run-images");

  input.addEventListener("change", () => {
    const files = validImageFiles(input.files);
    showFiles(files);
    button.disabled = files.length === 0;
  });

  button.addEventListener("click", async () => {
    const files = validImageFiles(input.files);

    await runTask(button, "Creating PDF…", async () => {
      const pdf = await PDFDocument.create();

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const image = file.type === "image/png"
          ? await pdf.embedPng(bytes)
          : await pdf.embedJpg(bytes);

        const maxWidth = 595;
        const maxHeight = 842;
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const width = image.width * scale;
        const height = image.height * scale;

        const page = pdf.addPage([maxWidth, maxHeight]);
        page.drawImage(image, {
          x: (maxWidth - width) / 2,
          y: (maxHeight - height) / 2,
          width,
          height,
        });
      }

      downloadBytes(await pdf.save(), "images.pdf");
    });
  });
}

function validPdfFiles(fileList) {
  return Array.from(fileList ?? []).filter(
    (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

function validImageFiles(fileList) {
  return Array.from(fileList ?? []).filter(
    (file) => file.type === "image/jpeg" || file.type === "image/png"
  );
}

async function loadPdf(file) {
  try {
    return await PDFDocument.load(await file.arrayBuffer());
  } catch {
    throw new Error(`Could not open "${file.name}". It may be damaged or password-protected.`);
  }
}

function showFiles(files) {
  const container = document.querySelector("#selected-files");
  if (!container) return;

  if (!files.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = files
    .map(
      (file, index) => `
        <div class="file-row">
          <span class="file-number">${index + 1}</span>
          <span class="file-name">${escapeHtml(file.name)}</span>
          <span class="file-size">${formatBytes(file.size)}</span>
        </div>
      `
    )
    .join("");
}

function parsePageSelection(value, pageCount) {
  const result = new Set();

  value.split(",").forEach((rawPart) => {
    const part = rawPart.trim();
    if (!part) return;

    if (part.includes("-")) {
      const [startText, endText] = part.split("-").map((item) => item.trim());
      const start = Number(startText);
      const end = Number(endText);

      if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
        throw new Error(`Invalid page range: "${part}".`);
      }

      for (let page = start; page <= end; page += 1) {
        if (page >= 1 && page <= pageCount) result.add(page - 1);
      }
    } else {
      const page = Number(part);
      if (!Number.isInteger(page)) {
        throw new Error(`Invalid page number: "${part}".`);
      }
      if (page >= 1 && page <= pageCount) result.add(page - 1);
    }
  });

  return Array.from(result).sort((a, b) => a - b);
}

function parseExplicitOrder(value, pageCount) {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((page) => Number.isInteger(page) && page >= 1 && page <= pageCount)
    .map((page) => page - 1);
}

async function runTask(button, workingText, task) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = workingText;
  setStatus(workingText);

  try {
    await task();
    setStatus("Finished. Your file has been downloaded.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Something went wrong.", "error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function setStatus(message, state = "") {
  const status = document.querySelector("#status");
  if (!status) return;

  status.textContent = message;
  status.className = `status ${state}`.trim();
}

function downloadBytes(bytes, fileName) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}
