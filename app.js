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


/* =========================
   أدوات
========================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/*
 * تحويل حجم الملف إلى MB بشكل مرتب
 */
function formatFileSize(bytes) {
  if (!bytes || Number(bytes) <= 0) {
    return null;
  }

  const mb = Number(bytes) / (1024 * 1024);

  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }

  const kb = Number(bytes) / 1024;

  return `${kb.toFixed(0)} KB`;
}


/* =========================
   تحديث معلومات اللعبة من GitHub
========================= */

/*
 * Arfi Chaplen:
 * ممنوع عليه التحديث التلقائي.
 *
 * يبقى دائمًا على الرابط الموجود
 * في games.json.
 */
async function getGameInfo(game) {

  if (game.id === "arfi-chaplen") {
    return game;
  }

  /*
   * إذا ماكانش repo أو asset
   * نستعمل البيانات الأصلية.
   */
  if (!game.repo || !game.asset) {
    return game;
  }

  try {

    const apiUrl =
      `https://api.github.com/repos/${game.repo}/releases/latest`;

    const response = await fetch(apiUrl, {
      cache: "no-store",
      headers: {
        "Accept": "application/vnd.github+json"
      }
    });

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status}`
      );
    }

    const release = await response.json();

    /*
     * حماية إضافية:
     * لا نستعمل Draft أو Pre-release.
     */
    if (
      release.draft ||
      release.prerelease
    ) {
      return game;
    }

    /*
     * البحث عن ملف APK المحدد في games.json
     */
    const asset = (release.assets || []).find(
      item => item.name === game.asset
    );

    /*
     * إذا ما لقيناش الـ APK،
     * نرجع للمعلومات القديمة.
     */
    if (!asset) {
      console.warn(
        `APK asset "${game.asset}" not found for ${game.id}`
      );

      return game;
    }

    /*
     * نسخة جديدة من بيانات اللعبة.
     * لا نغيّر الاسم والوصف والصورة والمميزات.
     */
    const updatedGame = {
      ...game,

      version:
        release.tag_name || game.version,

      size:
        formatFileSize(asset.size) || game.size,

      download:
        asset.browser_download_url || game.download
    };

    return updatedGame;

  } catch (error) {

    /*
     * فشل GitHub API لا يوقف الموقع.
     * نستعمل الرابط والبيانات الموجودة أصلًا.
     */
    console.warn(
      `Could not update ${game.id} from GitHub:`,
      error
    );

    return game;
  }
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

    /*
     * تحديث معلومات الألعاب من GitHub.
     *
     * Arfi مستثناة داخل getGameInfo().
     */
    const updatedGames = await Promise.all(
      games.map(game => getGameInfo(game))
    );

    gamesContainer.innerHTML = "";

    updatedGames.forEach(game => {

      const row = document.createElement("article");

      row.className = "game-row";

      const featuresText = (game.features || [])
        .map(feature => escapeHTML(feature))
        .join("، ");

      row.innerHTML = `
        <div class="game-head">

          <div class="game-icon">
            <img
              src="${escapeHTML(game.icon)}"
              alt="${escapeHTML(game.name)}"
              loading="lazy">
          </div>

          <div class="game-heading">
            <h3>${escapeHTML(game.name)}</h3>
            <p class="game-desc">${escapeHTML(game.description)}</p>
          </div>

        </div>

        <div class="game-meta">
          <span>${escapeHTML(game.version)}</span>
          <span>${escapeHTML(game.size)}</span>
          <span>${escapeHTML(game.price)}</span>
        </div>

        ${
          featuresText
            ? `
              <p class="game-features">
                <b>أبرز المميزات:</b> ${featuresText}
              </p>
            `
            : ""
        }

        <div class="game-actions">

          <a
            class="btn btn-primary"
            href="${escapeHTML(game.download)}">
            تحميل اللعبة
          </a>

          <button
            class="btn btn-ghost qr-btn"
            type="button"
            data-download="${escapeHTML(game.download)}"
            data-name="${escapeHTML(game.name)}">
            QR
          </button>

          <button
            class="btn btn-ghost copy-btn"
            type="button"
            data-url="${escapeHTML(game.download)}">
            نسخ الرابط
          </button>

        </div>
      `;

      gamesContainer.appendChild(row);
    });

    if (gamesCount) {
      gamesCount.textContent =
        `${updatedGames.length} ألعاب`;
    }

    setupGameButtons();

  } catch (error) {

    console.error(error);

    if (gamesCount) {
      gamesCount.textContent = "0 ألعاب";
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

  document
    .querySelectorAll(".copy-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const url =
            button.dataset.url || "";

          try {

            await navigator.clipboard.writeText(url);

          } catch {

            const helper =
              document.createElement("textarea");

            helper.value = url;
            helper.style.position = "fixed";
            helper.style.opacity = "0";

            document.body.appendChild(helper);

            helper.focus();
            helper.select();

            document.execCommand("copy");

            helper.remove();
          }

          const originalText =
            "نسخ الرابط";

          button.textContent =
            "تم النسخ";

          setTimeout(() => {

            button.textContent =
              originalText;

          }, 1800);
        }
      );
    });


  document
    .querySelectorAll("[data-download]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const url =
            button.dataset.download;

          const name =
            button.dataset.name || "";

          if (qrGameName) {
            qrGameName.textContent =
              name;
          }

          qrCode.innerHTML = "";

          new QRCode(qrCode, {
            text: url,
            width: 180,
            height: 180,
            colorDark: "#17161a",
            colorLight: "#ffffff",
            correctLevel:
              QRCode.CorrectLevel.H
          });

          qrModal.classList.remove(
            "hidden"
          );
        }
      );
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
    Number(
      localStorage.getItem(
        RATED_VALUE_KEY
      )
    ) || 0;

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

  star.addEventListener(
    "click",
    () => {

      if (
        localStorage.getItem(
          RATED_KEY
        ) === "true"
      ) {
        return;
      }

      selectedRating =
        Number(star.dataset.value);

      highlightStars(
        selectedRating
      );

      const messages = {

        1:
          "شكراً لملاحظتك، وين نقدر نطوّر؟",

        2:
          "شكراً لملاحظتك، وين نقدر نطوّر؟",

        3:
          "شكراً على رأيك، حاب تضيف تعليق؟",

        4:
          "يعطيك الصحة على تقييمك! حاب تضيف كلمة؟",

        5:
          "رهيب! شاركنا بكلمة على اللي عجبك 🎉"
      };

      rateThanks.textContent =
        messages[selectedRating];

      rateComment.classList.add(
        "show"
      );

      rateSend.classList.add(
        "show"
      );
    }
  );
});


/* =========================
   إرسال التقييم
========================= */

rateSend.addEventListener(
  "click",
  () => {

    if (
      !selectedRating ||
      localStorage.getItem(
        RATED_KEY
      ) === "true"
    ) {
      return;
    }


    const form =
      document.createElement("form");

    form.action =
      FORM_ACTION;

    form.method =
      "POST";

    form.target =
      "hidden_review_frame";


    const ratingInput =
      document.createElement("input");

    ratingInput.type =
      "hidden";

    ratingInput.name =
      ENTRY_RATING;

    ratingInput.value =
      selectedRating;

    form.appendChild(
      ratingInput
    );


    const commentInput =
      document.createElement("input");

    commentInput.type =
      "hidden";

    commentInput.name =
      ENTRY_COMMENT;

    commentInput.value =
      rateComment.value || "";

    form.appendChild(
      commentInput
    );


    document.body.appendChild(
      form
    );

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


    rateSend.disabled =
      true;

    rateSend.textContent =
      "تم إرسال تقييمك، شكراً لك! 🙏";

    rateComment.disabled =
      true;
  }
);


/* =========================
   QR Modal
========================= */

closeQr.addEventListener(
  "click",
  () => {

    qrModal.classList.add(
      "hidden"
    );
  }
);


qrModal.addEventListener(
  "click",
  event => {

    if (
      event.target === qrModal
    ) {
      qrModal.classList.add(
        "hidden"
      );
    }
  }
);


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      !qrModal.classList.contains(
        "hidden"
      )
    ) {
      qrModal.classList.add(
        "hidden"
      );
    }
  }
);


/* =========================
   تشغيل الموقع
========================= */

loadGames();
