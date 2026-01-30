<script setup>
import { ref, computed, onMounted, watch } from "vue";
const books = ref([]);
const q = ref("");
const error = ref("");
const info = ref("");

const editingId = ref(null);

const form = ref({
  title: "",
  author: "",
  status: "otthon",
  borrowedBy: "",
  borrowedSince: "",
});

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  if (!s) return books.value;
  return books.value.filter(
    (b) =>
      b.title.toLowerCase().includes(s) ||
      b.author.toLowerCase().includes(s) ||
      (b.borrowedBy || "").toLowerCase().includes(s),
  );
});

async function api(url, opts) {
  const base = import.meta.env.PROD ? "https://minilibary.onrender.com" : "";
  const res = await fetch(base + url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Hiba történt.");
  return data;
}

async function load() {
  error.value = "";
  info.value = "";
  books.value = await api("/api/books");
}

function resetForm() {
  editingId.value = null;
  form.value = {
    title: "",
    author: "",
    status: "otthon",
    borrowedBy: "",
    borrowedSince: "",
  };
}

function edit(b) {
  editingId.value = b.id;
  form.value = {
    title: b.title,
    author: b.author,
    status: b.status,
    borrowedBy: b.borrowedBy || "",
    borrowedSince: b.borrowedSince || "",
  };
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function save() {
  error.value = "";
  info.value = "";

  try {
    const payload = { ...form.value };

    if (payload.status === "kolcsonben" && !payload.borrowedSince) {
      payload.borrowedSince = new Date().toISOString().slice(0, 10);
    }

    if (editingId.value) {
      await api(`/api/books/${editingId.value}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      info.value = "Mentve.";
    } else {
      await api("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      info.value = "Hozzáadva.";
    }

    resetForm();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function removeBook(id) {
  error.value = "";
  info.value = "";
  if (!confirm("Biztos törlöd?")) return;
  try {
    await api(`/api/books/${id}`, { method: "DELETE" });
    info.value = "Törölve.";
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function markReturned(b) {
  error.value = "";
  info.value = "";
  try {
    await api(`/api/books/${b.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: b.title,
        author: b.author,
        status: "otthon",
        borrowedBy: "",
        borrowedSince: "",
      }),
    });
    info.value = "Visszavéve (otthon).";
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(load);

watch(
  () => form.value.status,
  (newStatus) => {
    if (newStatus === "otthon") {
      form.value.borrowedBy = "";
      form.value.borrowedSince = "";
    }
  },
);
</script>

<template>
  <div class="topbar">
    <h1>Otthoni Könyvtár</h1>
  </div>

  <div class="card">
    <h2 style="margin-top: 0">
      {{ editingId ? "Könyv szerkesztése" : "Új könyv" }}
    </h2>

    <form @submit.prevent="save">
      <div class="row">
        <input v-model="form.title" placeholder="Cím" class="input-wide" />
        <input v-model="form.author" placeholder="Író" class="input-wide" />
        <select v-model="form.status">
          <option value="otthon">Otthon</option>
          <option value="kolcsonben">Kölcsönben</option>
        </select>
      </div>

      <div
        v-if="form.status === 'kolcsonben'"
        class="row"
        style="margin-top: 12px"
      >
        <input
          v-model="form.borrowedBy"
          placeholder="Kinél van?"
          class="input-wide"
        />
        <input v-model="form.borrowedSince" type="date" class="date" />
        <div class="muted borrowed-hint">
          Ha a “Mióta” üres, automatikusan a mai dátumot kapja.
        </div>
      </div>

      <div class="row" style="margin-top: 12px">
        <button type="submit">
          {{ editingId ? "Mentés" : "Hozzáadás" }}
        </button>

        <button type="button" @click="resetForm">Mégse</button>
      </div>
    </form>

    <p v-if="error" class="danger" style="margin-bottom: 0">{{ error }}</p>
    <p v-if="info" style="margin-bottom: 0">{{ info }}</p>
  </div>

  <div class="card">
    <div
      class="row"
      style="align-items: center; justify-content: space-between"
    >
      <h2 style="margin: 0">Könyvek</h2>
      <input v-model="q" placeholder="Keresés (cím/író/kinél)" class="search" />
    </div>

    <table v-if="filtered.length">
      <thead>
        <tr>
          <th>Cím</th>
          <th>Író</th>
          <th>Státusz</th>
          <th>Részletek</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="b in filtered" :key="b.id">
          <td>{{ b.title }}</td>
          <td>{{ b.author }}</td>
          <td>{{ b.status === "otthon" ? "Otthon" : "Kölcsönben" }}</td>
          <td>
            <span v-if="b.status === 'kolcsonben'">
              {{ b.borrowedBy }} • {{ b.borrowedSince }}
            </span>
            <span v-else class="muted">—</span>
          </td>
          <td class="actions">
            <button
              v-if="b.status === 'kolcsonben'"
              type="button"
              @click="markReturned(b)"
            >
              Visszahozva
            </button>

            <button type="button" @click="edit(b)">Szerkeszt</button>
            <button type="button" @click="removeBook(b.id)">Töröl</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else class="muted">Nincs még könyv rögzítve.</p>
  </div>
</template>
