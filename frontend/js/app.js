const state = {
  paintings: [],
  settings: {},
  user: null,
  editingId: null
};

const $ = (selector) => document.querySelector(selector);
const galleryGrid = $('#galleryGrid');
const adminList = $('#adminList');
const emptyState = $('#emptyState');

function money(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(value || 0);
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(data.message || 'Algo salio mal.');
  }
  return data;
}

async function loadAll() {
  const [paintings, settings, session] = await Promise.all([
    api('/api/paintings'),
    api('/api/settings'),
    api('/api/auth/me')
  ]);

  state.paintings = paintings;
  state.settings = settings;
  state.user = session.user;
  applySettings();
  renderGallery();
  renderAdmin();
  renderAuth();
}

function applySettings() {
  const name = state.settings.artist_name || 'Galeria del Pintor';
  $('#brandName').textContent = name;
  $('#heroTitle').textContent = name;
  $('#artistNameInput').value = name;
  $('#whatsappInput').value = state.settings.whatsapp_phone || '';
  document.title = name;
}

function renderAuth() {
  $('#loginOpenBtn').classList.toggle('hidden', Boolean(state.user));
  $('#adminOpenBtn').classList.toggle('hidden', !state.user);
  $('#logoutBtn').classList.toggle('hidden', !state.user);
}

function renderGallery() {
  const term = $('#searchInput').value.trim().toLowerCase();
  const paintings = state.paintings.filter((painting) => {
    const text = `${painting.title} ${painting.description} ${painting.technique}`.toLowerCase();
    return text.includes(term);
  });

  galleryGrid.innerHTML = paintings.map((painting) => `
    <article class="painting-card">
      <img src="${painting.imageUrl}" alt="${escapeHtml(painting.title)}" loading="lazy" />
      <div class="painting-body">
        <h3>${escapeHtml(painting.title)}</h3>
        <div class="painting-meta">
          ${painting.technique ? `<span>${escapeHtml(painting.technique)}</span>` : ''}
          ${painting.dimensions ? `<span>${escapeHtml(painting.dimensions)}</span>` : ''}
          <span>${painting.isAvailable ? 'Disponible' : 'Apartada'}</span>
        </div>
        <p>${escapeHtml(painting.description)}</p>
        <div class="price">${money(painting.price)}</div>
        <a class="button whatsapp-button" href="${whatsappLink(painting)}" target="_blank" rel="noreferrer">
          Consultar por WhatsApp
        </a>
      </div>
    </article>
  `).join('');

  emptyState.classList.toggle('hidden', paintings.length > 0);
}

function renderAdmin() {
  if (!state.user) return;
  adminList.innerHTML = state.paintings.map((painting) => `
    <article class="admin-item">
      <img src="${painting.imageUrl}" alt="${escapeHtml(painting.title)}" />
      <div>
        <h4>${escapeHtml(painting.title)}</h4>
        <span>${money(painting.price)} - ${painting.isAvailable ? 'Disponible' : 'Apartada'}</span>
      </div>
      <div class="admin-actions">
        <button class="button ghost" data-edit="${painting.id}">Editar</button>
        <button class="button ghost" data-delete="${painting.id}">Borrar</button>
      </div>
    </article>
  `).join('');
}

function whatsappLink(painting) {
  const phone = String(state.settings.whatsapp_phone || '').replace(/\D/g, '');
  const message = `Hola, me interesa la pintura "${painting.title}" con precio ${money(painting.price)}.`;
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function openModal(id) {
  const modal = $(`#${id}`);
  if (!modal.open) modal.showModal();
}

function closeModal(id) {
  const modal = $(`#${id}`);
  if (modal.open) modal.close();
}

function resetPaintingForm() {
  state.editingId = null;
  $('#paintingForm').reset();
  $('#paintingId').value = '';
  $('#formTitle').textContent = 'Subir pintura';
  $('#paintingMessage').textContent = '';
}

$('#loginOpenBtn').addEventListener('click', () => openModal('loginModal'));
$('#adminOpenBtn').addEventListener('click', () => openModal('adminModal'));
$('#newPaintingBtn').addEventListener('click', resetPaintingForm);
$('#cancelEditBtn').addEventListener('click', resetPaintingForm);
$('#searchInput').addEventListener('input', renderGallery);

document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => closeModal(button.dataset.close));
});

$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#loginMessage').textContent = '';
  const formElement = event.currentTarget;
  const form = new FormData(formElement);

  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form))
    });
    state.user = result.user;
    formElement.reset();
    closeModal('loginModal');
    renderAuth();
    renderAdmin();
    openModal('adminModal');
  } catch (error) {
    $('#loginMessage').textContent = error.message;
  }
});

$('#logoutBtn').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  state.user = null;
  renderAuth();
  closeModal('adminModal');
});

$('#settingsForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await api('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(form))
  });
  state.settings = await api('/api/settings');
  applySettings();
});

$('#paintingForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const id = $('#paintingId').value;

  if (!id && !form.get('image').name) {
    $('#paintingMessage').textContent = 'Selecciona una imagen.';
    return;
  }

  form.set('isAvailable', event.currentTarget.isAvailable.checked ? 'true' : 'false');
  $('#paintingMessage').textContent = '';

  try {
    await api(id ? `/api/paintings/${id}` : '/api/paintings', {
      method: id ? 'PUT' : 'POST',
      body: form
    });
    resetPaintingForm();
    state.paintings = await api('/api/paintings');
    renderGallery();
    renderAdmin();
  } catch (error) {
    $('#paintingMessage').textContent = error.message;
  }
});

adminList.addEventListener('click', async (event) => {
  const editButton = event.target.closest('[data-edit]');
  const deleteButton = event.target.closest('[data-delete]');

  if (editButton) {
    const painting = state.paintings.find((item) => item.id === Number(editButton.dataset.edit));
    if (!painting) return;
    const form = $('#paintingForm');
    state.editingId = painting.id;
    $('#paintingId').value = painting.id;
    form.elements.title.value = painting.title;
    form.elements.description.value = painting.description;
    form.elements.price.value = painting.price;
    form.elements.technique.value = painting.technique;
    form.elements.dimensions.value = painting.dimensions;
    form.elements.isAvailable.checked = painting.isAvailable;
    $('#formTitle').textContent = 'Editar pintura';
  }

  if (deleteButton) {
    const wantsDelete = window.confirm('Quieres borrar esta pintura?');
    if (!wantsDelete) return;
    await api(`/api/paintings/${deleteButton.dataset.delete}`, { method: 'DELETE' });
    state.paintings = await api('/api/paintings');
    renderGallery();
    renderAdmin();
  }
});

loadAll().catch((error) => {
  galleryGrid.innerHTML = `<p class="form-message">${escapeHtml(error.message)}</p>`;
});
