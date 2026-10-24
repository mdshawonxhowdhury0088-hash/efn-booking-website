
/* Explore From Noakhali (EFN) — app.js */

const SUPABASE_URL = "https://cwaojyldfoawmzfmsvpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Nind35_zQ4MQNv7ejhNk6Q_9LXDxSBk";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = (id) => document.getElementById(id);

let tours = [];
let currentTour = null;
let currentFilter = "all";
let adminUser = null;

function message(id, text, error = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = error ? "#b42318" : "#087443";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function money(value) {
  return Number(value || 0).toLocaleString("en-BD") + " টাকা";
}

function dateText(value) {
  if (!value) return "তারিখ জানানো হবে";

  const d = new Date(value + "T00:00:00");

  return Number.isNaN(d.getTime())
    ? esc(value)
    : d.toLocaleDateString("bn-BD", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
}

function openDialog(id) {
  const el = $(id);
  if (el && !el.open) el.showModal();
}

function closeDialog(id) {
  const el = $(id);
  if (el?.open) el.close();
}

function notify(text) {
  const el = $("toast");
  if (!el) return;

  el.textContent = text;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

/* Close buttons */
document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    closeDialog(button.dataset.close);
  });
});

/* Load published tours */
async function loadTours() {
  const list = $("tour-list");

  if (list) {
    list.innerHTML = '<p class="loading">ট্যুর লোড হচ্ছে...</p>';
  }

  try {
    const { data, error } = await db
      .from("tours")
      .select("*")
      .eq("published", true)
      .order("tour_date", { ascending: true });

    if (error) throw error;

    tours = data || [];

    if ($("tour-count")) {
      $("tour-count").textContent = `${tours.length}টি ট্যুর`;
    }

    if (!list) return;

    if (!tours.length) {
      list.innerHTML = "<p>এখনো কোনো ট্যুর প্রকাশ করা হয়নি।</p>";
      return;
    }

    list.innerHTML = tours.map(t => `
      <article class="tour-card">
        <div class="tour-card-content">
          <h3>${esc(t.title_bn || t.title_en || "EFN Tour")}</h3>
          <p>${esc(t.location || "")}</p>
          <p>📅 ${dateText(t.tour_date)}</p>
          <p class="tour-price">${money(t.price)}</p>
          <p>${esc(t.description_bn || "")}</p>
          <button class="button button-primary full-width"
            type="button" data-book-tour="${esc(t.id)}">
            এখনই বুকিং দিন
          </button>
        </div>
      </article>
    `).join("");

    list.querySelectorAll("[data-book-tour]").forEach(button => {
      button.addEventListener("click", () => {
        currentTour = tours.find(
          t => String(t.id) === button.dataset.bookTour
        );

        if (!currentTour) return;

        $("booking-form").reset();
        $("booking-tour-id").value = currentTour.id;
        $("booking-title").textContent =
          currentTour.title_bn || currentTour.title_en || "ট্যুর বুকিং";

        message("booking-message", "");
        openDialog("booking-dialog");
      });
    });
  } catch (error) {
    console.error("Tours:", error);

    if (list) {
      list.innerHTML =
        "<p>ট্যুর লোড হয়নি। Supabase-এর tours টেবিল ও অনুমতি পরীক্ষা করুন।</p>";
    }
  }
}

/* Submit a booking */
$("booking-form")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = $("booking-form");
  const button = form.querySelector('[type="submit"]');

  if (!currentTour) {
    message("booking-message", "আগে একটি ট্যুর নির্বাচন করুন।", true);
    return;
  }

  const guest_name = $("guest-name").value.trim();
  const guest_phone = $("guest-phone").value.trim();
  const guest_count = Number($("guest-count").value);
  const trx_id = $("trx-id").value.trim();
  const note = $("booking-note").value.trim();

  if (
    !guest_name ||
    !guest_phone ||
    !Number.isInteger(guest_count) ||
    guest_count < 1 ||
    guest_count > 20
  ) {
    message("booking-message", "সঠিক তথ্য দিয়ে ফর্ম পূরণ করুন।", true);
    return;
  }

  button.disabled = true;
  message("booking-message", "বুকিং জমা হচ্ছে...");

  try {
    const { error } = await db.from("bookings").insert([{
  


tour_id: currentTour.id,
tour_name: String(
  currentTour.title_bn ||
  currentTour.title_en ||
  currentTour.title ||
  currentTour.name ||
  ""
).trim(),,
customer_name: guest_name,
phone: guest_phone,
guest_phone,
guest_count,
trx_id: trx_id || null,
note: note || null,
status: "pending"
}]);
    if (error) throw error;

    message(
      "booking-message",
      "বুকিং জমা হয়েছে! EFN-এর নিশ্চিতকরণের জন্য অপেক্ষা করুন।"
    );

    form.reset();
    currentTour = null;

    setTimeout(() => closeDialog("booking-dialog"), 2200);
  } catch (error) {
    console.error("Booking:", error);

    message(
      "booking-message",
      "বুকিং জমা হয়নি: " + (error.message || "অনুমতি বা টেবিল পরীক্ষা করুন।"),
      true
    );
  } finally {
    button.disabled = false;
  }
});

/* Admin login dialog */
$("admin-open")?.addEventListener("click", () => {
  openDialog("admin-dialog");
});

/* Admin login */
$("admin-login-form")?.addEventListener("submit", async event => {
  event.preventDefault();

  const button = event.currentTarget.querySelector('[type="submit"]');
  button.disabled = true;
  message("login-message", "লগইন হচ্ছে...");

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email: $("admin-email").value.trim(),
      password: $("admin-password").value
    });

    if (error) throw error;

    adminUser = data.user;

    $("admin-login-view").hidden = true;
    $("admin-dashboard").hidden = false;

    await loadAdminBookings();
    await loadAdminTours();

    message("login-message", "");
  } catch (error) {
    console.error("Admin login:", error);

    message(
      "login-message",
      "লগইন হয়নি: " + (error.message || "ইমেইল ও পাসওয়ার্ড পরীক্ষা করুন।"),
      true
    );
  } finally {
    button.disabled = false;
  }
});

/* Admin tabs */
document.querySelectorAll("[data-tab]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach(b => {
      b.classList.toggle("active", b === button);
    });

    const showBookings = button.dataset.tab === "bookings";

    $("admin-bookings-panel").hidden = !showBookings;
    $("admin-tours-panel").hidden = showBookings;
  });
});

/* Load admin bookings */
async function loadAdminBookings() {
  if (!adminUser) return;

  const container = $("booking-table");
  if (!container) return;

  container.innerHTML = "<p>বুকিং লোড হচ্ছে...</p>";

  try {
    let query = db.from("bookings")
      .select("*, tours(title_bn, title_en, tour_date)")
      .order("created_at", { ascending: false });

    if (currentFilter !== "all") {
      query = query.eq("status", currentFilter);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data?.length) {
      container.innerHTML = "<p>কোনো বুকিং পাওয়া যায়নি।</p>";
      return;
    }

    container.innerHTML = data.map(b => `
      <article class="admin-card">
        <h3>${esc(b.guest_name)}</h3>
        <p>ফোন: ${esc(b.guest_phone)}</p>
        <p>ট্যুর: ${esc(
          b.tours?.title_bn || b.tours?.title_en || "ট্যুর"
        )}</p>
        <p>যাত্রী: ${esc(b.guest_count)}</p>
        <p>TrxID: ${esc(b.trx_id || "দেওয়া হয়নি")}</p>
        <p>নোট: ${esc(b.note || "নেই")}</p>
        <p>স্ট্যাটাস: ${esc(b.status || "pending")}</p>
        <div class="button-row">
          <button class="button button-primary"
            data-booking-status="${esc(b.id)}"
            data-status="confirmed">নিশ্চিত করুন</button>
          <button class="button button-outline"
            data-booking-status="${esc(b.id)}"
            data-status="rejected">বাতিল করুন</button>
        </div>
      </article>
    `).join("");

    container.querySelectorAll("[data-booking-status]").forEach(button => {
      button.addEventListener("click", async () => {
        await updateBookingStatus(
          button.dataset.bookingStatus,
          button.dataset.status
        );
      });
    });
  } catch (error) {
    console.error("Admin bookings:", error);

    container.innerHTML =
      "<p>বুকিং লোড হয়নি। Admin access ও bookings টেবিলের অনুমতি পরীক্ষা করুন।</p>";
  }
}

/* Update booking status */
async function updateBookingStatus(id, status) {
  if (!adminUser) return;

  try {
    const { error } = await db.from("bookings")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    notify("বুকিংয়ের স্ট্যাটাস আপডেট হয়েছে।");
    await loadAdminBookings();
  } catch (error) {
    console.error("Update status:", error);
    notify("আপডেট হয়নি। Supabase অনুমতি পরীক্ষা করুন।");
  }
}

/* Booking filters and refresh */
$("status-filter")?.addEventListener("change", async event => {
  currentFilter = event.target.value;
  await loadAdminBookings();
});

$("refresh-bookings")?.addEventListener("click", loadAdminBookings);

/* Admin tour list */
async function loadAdminTours() {
  if (!adminUser) return;

  const container = $("admin-tour-list");
  if (!container) return;

  container.innerHTML = "<p>ট্যুর লোড হচ্ছে...</p>";

  try {
    const { data, error } = await db.from("tours")
      .select("*")
      .order("tour_date", { ascending: true });

    if (error) throw error;

    container.innerHTML = (data || []).map(t => `
      <article class="admin-card">
        <h3>${esc(t.title_bn || t.title_en)}</h3>
        <p>${esc(t.location)} — ${dateText(t.tour_date)}</p>
        <p>${money(t.price)} | সিট: ${esc(t.seats)}</p>
        <p>${t.published ? "প্রকাশিত" : "প্রকাশিত নয়"}</p>
        <button class="button button-outline"
          data-edit-tour="${esc(t.id)}">সম্পাদনা</button>
      </article>
    `).join("") || "<p>কোনো ট্যুর নেই।</p>";

    container.querySelectorAll("[data-edit-tour]").forEach(button => {
      button.addEventListener("click", () => {
        const tour = data.find(
          t => String(t.id) === button.dataset.editTour
        );

        if (!tour) return;

        $("edit-tour-id").value = tour.id;
        $("tour-title-bn").value = tour.title_bn || "";
        $("tour-title-en").value = tour.title_en || "";
        $("tour-location").value = tour.location || "";
        $("tour-date").value = tour.tour_date || "";
        $("tour-price").value = tour.price ?? 0;
        $("tour-seats").value = tour.seats ?? 1;
        $("tour-desc-bn").value = tour.description_bn || "";
        $("tour-desc-en").value = tour.description_en || "";
        $("tour-published").checked = !!tour.published;

        $("admin-tours-panel").scrollIntoView({
          behavior: "smooth"
        });
      });
    });
  } catch (error) {
    console.error("Admin tours:", error);

    container.innerHTML =
      "<p>ট্যুর লোড হয়নি। tours টেবিলের অনুমতি পরীক্ষা করুন।</p>";
  }
}

/* Add or edit a tour */
$("tour-form")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!adminUser) {
    message("tour-form-message", "আগে অ্যাডমিন লগইন করুন।", true);
    return;
  }

  const form = $("tour-form");
  const button = form.querySelector('[type="submit"]');

  const id = $("edit-tour-id").value;

  const tour = {
    title_bn: $("tour-title-bn").value.trim(),
    title_en: $("tour-title-en").value.trim(),
    location: $("tour-location").value.trim(),
    tour_date: $("tour-date").value,
    price: Number($("tour-price").value),
    seats: Number($("tour-seats").value),
    description_bn: $("tour-desc-bn").value.trim(),
    description_en: $("tour-desc-en").value.trim(),
    published: $("tour-published").checked
  };

  button.disabled = true;

  try {
    const result = id
      ? await db.from("tours").update(tour).eq("id", id)
      : await db.from("tours").insert([tour]);

    if (result.error) throw result.error;

    message("tour-form-message", "ট্যুর সেভ হয়েছে।");

    form.reset();
    $("edit-tour-id").value = "";

    await loadAdminTours();
    await loadTours();
  } catch (error) {
    console.error("Save tour:", error);

    message(
      "tour-form-message",
      "সেভ হয়নি: " + (error.message || JSON.stringify(error)),
      true
    );
  } finally {
    button.disabled = false;
  }
});

/* Reset tour form */
$("reset-tour-form")?.addEventListener("click", () => {
  $("tour-form").reset();
  $("edit-tour-id").value = "";
  message("tour-form-message", "");
});

/* Admin logout */
$("admin-logout")?.addEventListener("click", async () => {
  try {
    await db.auth.signOut();
  } catch (error) {
    console.error("Admin logout:", error);
  }

  adminUser = null;

  $("admin-dashboard").hidden = true;
  $("admin-login-view").hidden = false;

  closeDialog("admin-dialog");
  notify("লগআউট হয়েছে।");
});

/* Start website */
loadTours();
