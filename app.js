const gamesContainer = document.getElementById("games");
const gamesCount = document.getElementById("gamesCount");

const qrModal = document.getElementById("qrModal");
const qrCode = document.getElementById("qrCode");
const qrGameName = document.getElementById("qrGameName");
const closeQr = document.getElementById("closeQr");

const stars = document.querySelectorAll("#stars button");
const rateThanks = document.getElementById("rateThanks");
const rateComment = document.getElementById("rateComment");
const rateSend = document.getElementById("rateSend");

/*
 * Google Form القديم
 */
const FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLSciA2BrMj1qvAE3t9vws_6a9VA4uHFxHlu1NH6Dk41p0IVlPg/formResponse";

const ENTRY_RATING =
  "entry.388883488";

const ENTRY_COMMENT =
  "entry.23194708";

/*
 * تقييم واحد عام للموقع والألعاب كلها
 */
const RATED_KEY = "games_site_rated";
const RATED_VALUE_KEY = "games_site_rated_value";

let selectedRating = 0;

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================
   الألعاب
========================= */

async function loadGames() {

  try {

    const response = await fetch("games.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("games.json not found");
    }

    const games = await response.json();

    gamesContainer.innerHTML = "";

    games.forEach(game => {

      const card = document.createElement("article");

      card.className = "game-card";

      card.innerHTML = `
        <div class="game-image">
          <span class="game-badge">${escapeHTML(game.price)}</span>
          <img
            src="${escapeHTML(game.icon)}"
            alt="${escapeHTML(game.name)}"
            loading="lazy">
        </div>

        <div class="game-content">

          <h3>${escapeHTML(game.name)}</h3>

          <p class="description">
            ${escapeHTML(game.description)}
          </p>

          <div class="meta">
            <span>${escapeHTML(game.version)}</span>
            <span>${escapeHTML(game.size)}</span>
            <span>${escapeHTML(game.price)}</span>
          </div>

          <ul class="features">
            ${(game.features || [])
              .map(feature =>
                `<li>${escapeHTML(feature)}</li>`
              )
              .join("")}
          </ul>

          <div class="actions">

            <a
              class="btn download"
              href="${escapeHTML(game.download)}">
              تحميل اللعبة
            </a>

            <button
              class="btn qr"
              type="button"
              data-download="${escapeHTML(game.download)}"
              data-name="${escapeHTML(game.name)}">
              عرض QR للتحميل
            </button>

            <div class="link-box">

              <input
                value="${escapeHTML(game.download)}"
                readonly
                aria-label="رابط تحميل ${escapeHTML(game.name)}">

              <button class="copy" type="button">
                نسخ
              </button>

            </div>

          </div>

        </div>
      `;

      gamesContainer.appendChild(card);
    });

    if (gamesCount) {
      gamesCount.textContent = games.length;
    }

    setupGameButtons();

  } catch (error) {

    console.error(error);

    if (gamesCount) {
      gamesCount.textContent = "0";
    }

    gamesContainer.innerHTML = `
      <div class="loading">
        ما قدرناش نحمل قائمة الألعاب.
      </div>
    `;
  }
}


/* =========================
   أزرار الألعاب
========================= */

function setupGameButtons() {

  document.querySelectorAll(".copy")
    .forEach(button => {

      button.addEventListener("click", async () => {

        const input =
          button.parentElement.querySelector("input");

        try {

          await navigator.clipboard.writeText(input.value);

        } catch {

          input.select();
          document.execCommand("copy");

        }

        button.textContent = "تم النسخ";

        setTimeout(() => {
          button.textContent = "نسخ";
        }, 1800);

      });

    });


  document.querySelectorAll("[data-download]")
    .forEach(button => {

      button.addEventListener("click", () => {

        const url = button.dataset.download;
        const name = button.dataset.name || "";

        if (qrGameName) {
          qrGameName.textContent = name;
        }

        qrCode.innerHTML = "";

        new QRCode(qrCode, {
          text: url,
          width: 190,
          height: 190,
          colorDark: "#060810",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });

        qrModal.classList.remove("hidden");

      });

    });
}


/* =========================
   التقييم العام
========================= */

function highlightStars(value) {

  stars.forEach(star => {

    const starValue =
      Number(star.dataset.value);

    star.classList.toggle(
      "active",
      starValue <= value
    );

  });
}


const alreadyRated =
  localStorage.getItem(RATED_KEY) === "true";


if (alreadyRated) {

  const savedValue =
    Number(localStorage.getItem(RATED_VALUE_KEY)) || 0;

  if (savedValue) {
    highlightStars(savedValue);
  }

  rateThanks.textContent =
    "سبق وأرسلت تقييمك، شكراً لك! 🙏";

  rateSend.classList.add("show");

  rateSend.disabled = true;

  rateSend.textContent =
    "تم إرسال تقييمك مسبقاً";
}


stars.forEach(star => {

  star.addEventListener("click", () => {

    if (
      localStorage.getItem(RATED_KEY) === "true"
    ) {
      return;
    }

    selectedRating =
      Number(star.dataset.value);

    highlightStars(selectedRating);

    const messages = {

      1: "شكراً لملاحظتك، وين نقدر نطوّر؟",

      2: "شكراً لملاحظتك، وين نقدر نطوّر؟",

      3: "شكراً على رأيك، حاب تضيف تعليق؟",

      4: "يعطيك الصحة على تقييمك! حاب تضيف كلمة؟",

      5: "رهيب! شاركنا بكلمة على اللي عجبك 🎉"

    };

    rateThanks.textContent =
      messages[selectedRating];

    rateComment.classList.add("show");

    rateSend.classList.add("show");

  });

});


/* =========================
   إرسال التقييم
========================= */

rateSend.addEventListener("click", () => {

  if (
    !selectedRating ||
    localStorage.getItem(RATED_KEY) === "true"
  ) {
    return;
  }


  const form =
    document.createElement("form");

  form.action = FORM_ACTION;

  form.method = "POST";

  form.target = "hidden_review_frame";


  const ratingInput =
    document.createElement("input");

  ratingInput.type = "hidden";

  ratingInput.name = ENTRY_RATING;

  ratingInput.value = selectedRating;

  form.appendChild(ratingInput);


  const commentInput =
    document.createElement("input");

  commentInput.type = "hidden";

  commentInput.name = ENTRY_COMMENT;

  commentInput.value =
    rateComment.value || "";

  form.appendChild(commentInput);


  document.body.appendChild(form);

  form.submit();

  form.remove();


  /*
   * حفظ حالة التقييم على هذا الجهاز
   */

  localStorage.setItem(
    RATED_KEY,
    "true"
  );

  localStorage.setItem(
    RATED_VALUE_KEY,
    String(selectedRating)
  );


  rateSend.disabled = true;

  rateSend.textContent =
    "تم إرسال تقييمك، شكراً لك! 🙏";

  rateComment.disabled = true;

});


/* =========================
   QR Modal
========================= */

closeQr.addEventListener("click", () => {
  qrModal.classList.add("hidden");
});


qrModal.addEventListener("click", event => {

  if (event.target === qrModal) {
    qrModal.classList.add("hidden");
  }

});


document.addEventListener("keydown", event => {

  if (
    event.key === "Escape" &&
    !qrModal.classList.contains("hidden")
  ) {
    qrModal.classList.add("hidden");
  }

});


/* =========================
   تشغيل الموقع
========================= */

loadGames();
