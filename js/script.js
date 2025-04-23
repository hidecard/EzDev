const SOURCE_CODES_API = 'https://script.google.com/macros/s/AKfycbxSVWOpcvKb0i9TPU0Y9NKwlsqFP5qYDAaaQ6B3Qy4WehUknyvihvo3NNeXaSNJs4wtKQ/exec?action=source_codes';
const BLOG_POSTS_API = 'https://script.google.com/macros/s/AKfycbxSVWOpcvKb0i9TPU0Y9NKwlsqFP5qYDAaaQ6B3Qy4WehUknyvihvo3NNeXaSNJs4wtKQ/exec?action=blog_posts';

let sourceCodes = [];
let blogPosts = [];
let currentCategory = 'All';
let currentSearch = '';
let searchTimeout = null;
let sourceCodesPage = 1;
let blogPostsPage = 1;
const ITEMS_PER_PAGE = 8;

function getLocalStore(key, defaultValue = {}) {
  try {
    return JSON.parse(localStorage.getItem(key)) || defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setLocalStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

function toggleFavorite(itemId, type) {
  if (!Number.isInteger(itemId)) return false;
  const favorites = getLocalStore('favorites');
  if (!favorites[type]) favorites[type] = [];
  const index = favorites[type].indexOf(itemId);
  const isAdding = index === -1;
  if (isAdding) {
    favorites[type].push(itemId);
  } else {
    favorites[type].splice(index, 1);
  }
  setLocalStore('favorites', favorites);
  return isAdding;
}

function isFavorited(itemId, type) {
  if (!Number.isInteger(itemId)) return false;
  const favorites = getLocalStore('favorites');
  return favorites[type]?.includes(itemId) || false;
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  setLocalStore('theme', isDark ? 'dark' : 'light');
  const toggleIcon = document.querySelector('#theme-toggle i');
  toggleIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

function initDarkMode() {
  const theme = getLocalStore('theme', 'light');
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    document.querySelector('#theme-toggle i').className = 'fas fa-sun';
  }
}

function initBackToTop() {
  const backToTop = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    backToTop.style.display = window.scrollY > 300 ? 'block' : 'none';
  });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function showSection(section) {
  const sections = document.querySelectorAll('#main-content > div');
  if (!sections.length) return;

  sections.forEach(div => (div.style.display = 'none'));
  const sectionElement = document.getElementById(`${section}-section`);
  if (!sectionElement) return;
  sectionElement.style.display = 'block';

  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  const activeLink = document.querySelector(`[data-section="${section}"]`);
  if (activeLink) activeLink.classList.add('active');

  currentCategory = 'All';
  currentSearch = '';
  if (section === 'source_codes') sourceCodesPage = 1;
  if (section === 'blog') blogPostsPage = 1;

  const categoryFilter = sectionElement.querySelector('.category-filter');
  const searchBar = sectionElement.querySelector('.search-bar');
  const clearSearch = sectionElement.querySelector('.clear-search');
  const suggestions = sectionElement.querySelector('.search-suggestions');

  if (searchBar) searchBar.value = '';
  if (clearSearch) clearSearch.style.display = 'none';
  if (suggestions) suggestions.innerHTML = '';

  if (section === 'home') {
    document.title = 'Ez Dev - Home';
  } else if (section === 'source_codes') {
    loadSourceCodes();
    document.title = 'Ez Dev - Source Codes';
  } else if (section === 'blog') {
    loadBlogPosts();
    document.title = 'Ez Dev - Blog';
  } else if (section === 'about_us') {
    document.title = 'Ez Dev - About Us';
  } else if (section === 'favorites') {
    loadFavorites();
    document.title = 'Ez Dev - Favorites';
  } else if (section === 'blog-detail') {
    document.title = 'Ez Dev - Blog Detail';
  } else {
    document.title = `Ez Dev - ${section.charAt(0).toUpperCase() + section.slice(1)}`;
  }

  if (categoryFilter) {
    categoryFilter.onchange = e => {
      filterCategory(e.target.value, section);
    };
  }
  if (searchBar) {
    searchBar.oninput = e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchItems(e.target.value, section);
        if (clearSearch) clearSearch.style.display = e.target.value ? 'block' : 'none';
        showSearchSuggestions(e.target.value, section);
      }, 300);
    };
  }
  if (clearSearch) {
    clearSearch.onclick = () => {
      if (searchBar) {
        searchBar.value = '';
        clearSearch.style.display = 'none';
        searchItems('', section);
        if (suggestions) suggestions.innerHTML = '';
      }
    };
  }
}

function populateCategoryFilter(section) {
  const sectionElement = document.getElementById(`${section}-section`);
  if (!sectionElement) return;
  const categoryFilter = sectionElement.querySelector('.category-filter');
  if (!categoryFilter) return;

  const items = section === 'source_codes' ? sourceCodes : blogPosts;
  const categories = [...new Set(
    items
      .map(item => item.category)
      .filter(cat => cat && typeof cat === 'string')
  )].sort();

  categoryFilter.innerHTML = '<option value="All">All</option>';
  if (categories.length === 0) {
    categoryFilter.innerHTML += '<option value="" disabled>No categories available</option>';
  } else {
    categories.forEach(category => {
      categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
    });
  }
  categoryFilter.value = 'All';
}

function showSearchSuggestions(query, section) {
  const sectionElement = document.getElementById(`${section}-section`);
  if (!sectionElement) return;
  const suggestionsList = sectionElement.querySelector('.search-suggestions');
  if (!suggestionsList) return;

  suggestionsList.innerHTML = '';
  if (!query) return;

  const items = section === 'source_codes' ? sourceCodes : blogPosts;
  const searchLower = query.toLowerCase();
  const matches = items
    .filter(item =>
      (item.title?.toLowerCase() || '').includes(searchLower) ||
      (item.description?.toLowerCase() || '').includes(searchLower) ||
      (item.content?.toLowerCase() || '').includes(searchLower)
    )
    .slice(0, 5);

  if (matches.length === 0) {
    suggestionsList.innerHTML = '<li class="list-group-item">No matches found</li>';
    return;
  }

  matches.forEach(item => {
    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-action';
    li.textContent = item.title || 'Untitled';
    li.onclick = () => {
      const searchBar = sectionElement.querySelector('.search-bar');
      if (searchBar) {
        searchBar.value = item.title || '';
        searchItems(item.title || '', section);
        suggestionsList.innerHTML = '';
      }
    };
    suggestionsList.appendChild(li);
  });
}

function loadSourceCodes() {
  const codeList = document.getElementById('code-list');
  const spinner = codeList.querySelector('.spinner-container');
  if (!codeList || !spinner) return;

  if (!sourceCodes.length) {
    spinner.style.display = 'block';
    fetch(SOURCE_CODES_API)
      .then(response => response.json())
      .then(data => {
        sourceCodes = Array.isArray(data) ? data.filter(item => Number.isInteger(item.id)) : [];
        spinner.style.display = 'none';
        populateCategoryFilter('source_codes');
        displaySourceCodes();
      })
      .catch(error => {
        spinner.style.display = 'none';
        codeList.innerHTML = '<p class="text-center text-danger">Failed to load source codes.</p>';
      });
  } else {
    spinner.style.display = 'none';
    populateCategoryFilter('source_codes');
    displaySourceCodes();
  }
}

function goToPage(page, section) {
  if (section === 'source_codes') {
    sourceCodesPage = Math.max(1, Math.min(page, Math.ceil(sourceCodes.length / ITEMS_PER_PAGE)));
    displaySourceCodes();
  } else if (section === 'blog') {
    blogPostsPage = Math.max(1, Math.min(page, Math.ceil(blogPosts.length / ITEMS_PER_PAGE)));
    displayBlogPosts();
  }
}

function renderPagination(totalItems, currentPage, section, containerId) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages <= 1) return '';

  let paginationHtml = `
    <nav aria-label="pagination" class="d-flex justify-content-center mt-4">
      <ul class="pagination">
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}, '${section}'); return false;" aria-label="Previous">
            <span aria-hidden="true">«</span>
          </a>
        </li>
  `;

  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    paginationHtml += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="goToPage(1, '${section}'); return false;">1</a>
      </li>
    `;
    if (startPage > 2) {
      paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHtml += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${i}, '${section}'); return false;">${i}</a>
      </li>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    paginationHtml += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="goToPage(${totalPages}, '${section}'); return false;">${totalPages}</a>
      </li>
    `;
  }

  paginationHtml += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
          <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}, '${section}'); return false;" aria-label="Next">
            <span aria-hidden="true">»</span>
          </a>
        </li>
      </ul>
    </nav>
  `;

  return paginationHtml;
}

function displaySourceCodes() {
  const codeList = document.getElementById('code-list');
  if (!codeList) return;

  codeList.innerHTML = '<div class="spinner-container text-center" style="display: none;"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
  let filteredCodes = sourceCodes;
  if (currentCategory !== 'All') {
    filteredCodes = filteredCodes.filter(code => code.category === currentCategory);
  }
  if (currentSearch) {
    const searchLower = currentSearch.toLowerCase();
    filteredCodes = filteredCodes.filter(code => 
      (code.title?.toLowerCase() || '').includes(searchLower) || 
      (code.description?.toLowerCase() || '').includes(searchLower)
    );
  }

  if (filteredCodes.length === 0) {
    codeList.innerHTML = '<p class="text-center">No source codes found.</p>';
    return;
  }

  const startIndex = (sourceCodesPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCodes = filteredCodes.slice(startIndex, endIndex);

  paginatedCodes.forEach(code => {
    const downloadZipUrl = code.github_repo ? `${code.github_repo}/archive/refs/heads/main.zip` : '#';
    const isFav = isFavorited(code.id, 'source_codes') ? 'active' : '';
    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(`Check out this source code: ${code.title || 'Untitled'} on Ez Dev`);

    codeList.innerHTML += `
      <div class="col-12 col-md-6 col-lg-4 mb-4">
        <div class="card h-100">
          <img src="${code.thumbnail || 'https://via.placeholder.com/150'}" class="card-img-top" alt="${code.title || 'No title'}" loading="lazy">
          <div class="card-body">
            <h5 class="card-title">${code.title || 'Untitled'}</h5>
            <p class="card-text">${code.description || 'No description'}</p>
            <p><strong>Category:</strong> ${code.category || 'Uncategorized'}</p>
            <p><strong>Author:</strong> ${code.author || 'Unknown'}</p>
            <p><strong>Date:</strong> ${code.date || 'N/A'}</p>
            <div class="d-flex flex-wrap gap-2">
              <a href="${code.demo || '#'}" class="btn btn-primary" target="_blank" ${!code.demo ? 'disabled' : ''}>Demo</a>
              <a href="${downloadZipUrl}" class="btn btn-download" ${!code.github_repo ? 'disabled' : ''}><i class="fab fa-github"></i> Download ZIP</a>
              <button class="btn btn-favorite ${isFav}" onclick="toggleFavorite(${code.id}, 'source_codes'); displaySourceCodes()">
                <i class="fas fa-heart"></i> ${isFav ? 'Unfavorite' : 'Favorite'}
              </button>
              <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}" class="btn btn-share btn-twitter" target="_blank"><i class="fab fa-twitter"></i></a>
              <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" class="btn btn-share btn-telegram" target="_blank"><i class="fab fa-telegram-plane"></i></a>
              <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" class="btn btn-share btn-facebook" target="_blank"><i class="fab fa-facebook-f"></i></a>
              <a href="mailto:?subject=${shareText}&body=${shareUrl}" class="btn btn-share btn-email" target="_blank"><i class="fas fa-envelope"></i></a>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  codeList.innerHTML += renderPagination(filteredCodes.length, sourceCodesPage, 'source_codes', 'code-list');
}

function loadBlogPosts() {
  const blogList = document.getElementById('blog-list');
  const spinner = blogList.querySelector('.spinner-container');
  if (!blogList || !spinner) return;

  if (!blogPosts.length) {
    spinner.style.display = 'block';
    fetch(BLOG_POSTS_API)
      .then(response => response.json())
      .then(data => {
        blogPosts = Array.isArray(data) ? data.filter(item => Number.isInteger(item.id)) : [];
        spinner.style.display = 'none';
        populateCategoryFilter('blog');
        displayBlogPosts();
      })
      .catch(error => {
        spinner.style.display = 'none';
        blogList.innerHTML = '<p class="text-center text-danger">Failed to load blog posts.</p>';
      });
  } else {
    spinner.style.display = 'none';
    populateCategoryFilter('blog');
    displayBlogPosts();
  }
}

function displayBlogPosts() {
  const blogList = document.getElementById('blog-list');
  if (!blogList) return;

  blogList.innerHTML = '<div class="spinner-container text-center" style="display: none;"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
  let filteredPosts = blogPosts;
  if (currentCategory !== 'All') {
    filteredPosts = filteredPosts.filter(post => post.category === currentCategory);
  }
  if (currentSearch) {
    const searchLower = currentSearch.toLowerCase();
    filteredPosts = filteredPosts.filter(post => 
      (post.title?.toLowerCase() || '').includes(searchLower) || 
      (post.content?.toLowerCase() || '').includes(searchLower)
    );
  }

  if (filteredPosts.length === 0) {
    blogList.innerHTML = '<p class="text-center">No blog posts found.</p>';
    return;
  }

  const startIndex = (blogPostsPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

  paginatedPosts.forEach(post => {
    const isFav = isFavorited(post.id, 'blog_posts') ? 'active' : '';
    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(`Check out this blog post: ${post.title || 'Untitled'} on Ez Dev`);

    blogList.innerHTML += `
      <div class="col-12 col-md-6 col-lg-4 mb-4">
        <div class="card h-100">
          <img src="${post.thumbnail || 'https://via.placeholder.com/150'}" class="card-img-top" alt="${post.title || 'No title'}" loading="lazy">
          <div class="card-body">
            <h5 class="card-title">${post.title || 'Untitled'}</h5>
            <p class="card-text">${(post.content || 'No content').substring(0, 100)}...</p>
            <p><strong>Category:</strong> ${post.category || 'Uncategorized'}</p>
            <p><strong>Author:</strong> ${post.author || 'Unknown'}</p>
            <p><strong>Date:</strong> ${post.date || 'N/A'}</p>
            <div class="d-flex flex-wrap gap-2">
              <a href="#" class="btn btn-primary" onclick="showBlogDetail(${post.id})">Read More</a>
              <button class="btn btn-favorite ${isFav}" onclick="toggleFavorite(${post.id}, 'blog_posts'); displayBlogPosts()">
                <i class="fas fa-heart"></i> ${isFav ? 'Unfavorite' : 'Favorite'}
              </button>
              <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}" class="btn btn-share btn-twitter" target="_blank"><i class="fab fa-twitter"></i></a>
              <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" class="btn btn-share btn-telegram" target="_blank"><i class="fab fa-telegram-plane"></i></a>
              <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" class="btn btn-share btn-facebook" target="_blank"><i class="fab fa-facebook-f"></i></a>
              <a href="mailto:?subject=${shareText}&body=${shareUrl}" class="btn btn-share btn-email" target="_blank"><i class="fas fa-envelope"></i></a>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  blogList.innerHTML += renderPagination(filteredPosts.length, blogPostsPage, 'blog', 'blog-list');
}

function showBlogDetail(postId) {
  if (!Number.isInteger(postId)) return;

  const blogDetailContent = document.getElementById('blog-detail-content');
  if (!blogDetailContent) return;

  const post = blogPosts.find(p => p.id === postId);
  if (!post) {
    blogDetailContent.innerHTML = '<p class="text-center">Blog post not found.</p>';
    showSection('blog-detail');
    return;
  }

  const isFav = isFavorited(post.id, 'blog_posts') ? 'active' : '';
  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent(`Check out this blog post: ${post.title || 'Untitled'} on Ez Dev`);

  blogDetailContent.innerHTML = `
    <div class="blog-detail">
      <h2 class="mb-3">${post.title || 'Untitled'}</h2>
      <img src="${post.thumbnail || 'https://via.placeholder.com/150'}" class="img-fluid mb-3" alt="${post.title || 'No title'}" loading="lazy">
      <p><strong>Category:</strong> ${post.category || 'Uncategorized'}</p>
      <p><strong>Author:</strong> ${post.author || 'Unknown'}</p>
      <p><strong>Date:</strong> ${post.date || 'N/A'}</p>
      <p class="mb-4">${post.content || 'No content'}</p>
      <div class="d-flex flex-wrap gap-2">
        <button class="btn btn-favorite ${isFav}" onclick="toggleFavorite(${post.id}, 'blog_posts'); showBlogDetail(${post.id})">
          <i class="fas fa-heart"></i> ${isFav ? 'Unfavorite' : 'Favorite'}
        </button>
        <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}" class="btn btn-share btn-twitter" target="_blank"><i class="fab fa-twitter"></i></a>
        <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" class="btn btn-share btn-telegram" target="_blank"><i class="fab fa-telegram-plane"></i></a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" class="btn btn-share btn-facebook" target="_blank"><i class="fab fa-facebook-f"></i></a>
        <a href="mailto:?subject=${shareText}&body=${shareUrl}" class="btn btn-share btn-email" target="_blank"><i class="fas fa-envelope"></i></a>
        <a href="#" class="btn btn-secondary" onclick="showSection('blog')">Back to Blog</a>
      </div>
    </div>
  `;

  showSection('blog-detail');
}

function loadFavorites() {
  const favoritesList = document.getElementById('favorites-list');
  if (!favoritesList) return;

  favoritesList.innerHTML = '';
  const favorites = getLocalStore('favorites');

  if (favorites.source_codes?.length) {
    const favCodes = sourceCodes.filter(code => favorites.source_codes.includes(code.id));
    favCodes.forEach(code => {
      const downloadZipUrl = code.github_repo ? `${code.github_repo}/archive/refs/heads/main.zip` : '#';
      const shareUrl = encodeURIComponent(window.location.href);
      const shareText = encodeURIComponent(`Check out this source code: ${code.title || 'Untitled'} on Ez Dev`);

      favoritesList.innerHTML += `
        <div class="col-12 col-md-6 col-lg-4 mb-4">
          <div class="card h-100">
            <img src="${code.thumbnail || 'https://via.placeholder.com/150'}" class="card-img-top" alt="${code.title || 'No title'}" loading="lazy">
            <div class="card-body">
              <h5 class="card-title">${code.title || 'Untitled'}</h5>
              <p class="card-text">${code.description || 'No description'}</p>
              <p><strong>Category:</strong> ${code.category || 'Uncategorized'}</p>
              <p><strong>Author:</strong> ${code.author || 'Unknown'}</p>
              <p><strong>Date:</strong> ${code.date || 'N/A'}</p>
              <div class="d-flex flex-wrap gap-2">
                <a href="${code.demo || '#'}" class="btn btn-primary" target="_blank" ${!code.demo ? 'disabled' : ''}>Demo</a>
                <a href="${downloadZipUrl}" class="btn btn-download" ${!code.github_repo ? 'disabled' : ''}><i class="fab fa-github"></i> Download ZIP</a>
                <button class="btn btn-favorite active" onclick="toggleFavorite(${code.id}, 'source_codes'); loadFavorites()">
                  <i class="fas fa-heart"></i> Unfavorite
                </button>
                <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}" class="btn btn-share btn-twitter" target="_blank"><i class="fab fa-twitter"></i></a>
                <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" class="btn btn-share btn-telegram" target="_blank"><i class="fab fa-telegram-plane"></i></a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" class="btn btn-share btn-facebook" target="_blank"><i class="fab fa-facebook-f"></i></a>
                <a href="mailto:?subject=${shareText}&body=${shareUrl}" class="btn btn-share btn-email" target="_blank"><i class="fas fa-envelope"></i></a>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }

  if (favorites.blog_posts?.length) {
    const favPosts = blogPosts.filter(post => favorites.blog_posts.includes(post.id));
    favPosts.forEach(post => {
      const shareUrl = encodeURIComponent(window.location.href);
      const shareText = encodeURIComponent(`Check out this blog post: ${post.title || 'Untitled'} on Ez Dev`);

      favoritesList.innerHTML += `
        <div class="col-12 col-md-6 col-lg-4 mb-4">
          <div class="card h-100">
            <img src="${post.thumbnail || 'https://via.placeholder.com/150'}" class="card-img-top" alt="${post.title || 'No title'}" loading="lazy">
            <div class="card-body">
              <h5 class="card-title">${post.title || 'Untitled'}</h5>
              <p class="card-text">${(post.content || 'No content').substring(0, 100)}...</p>
              <p><strong>Category:</strong> ${post.category || 'Uncategorized'}</p>
              <p><strong>Author:</strong> ${post.author || 'Unknown'}</p>
              <p><strong>Date:</strong> ${post.date || 'N/A'}</p>
              <div class="d-flex flex-wrap gap-2">
                <a href="#" class="btn btn-primary" onclick="showBlogDetail(${post.id})">Read More</a>
                <button class="btn btn-favorite active" onclick="toggleFavorite(${post.id}, 'blog_posts'); loadFavorites()">
                  <i class="fas fa-heart"></i> Unfavorite
                </button>
                <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}" class="btn btn-share btn-twitter" target="_blank"><i class="fab fa-twitter"></i></a>
                <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" class="btn btn-share btn-telegram" target="_blank"><i class="fab fa-telegram-plane"></i></a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" class="btn btn-share btn-facebook" target="_blank"><i class="fab fa-facebook-f"></i></a>
                <a href="mailto:?subject=${shareText}&body=${shareUrl}" class="btn btn-share btn-email" target="_blank"><i class="fas fa-envelope"></i></a>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }

  if (!favorites.source_codes?.length && !favorites.blog_posts?.length) {
    favoritesList.innerHTML = '<p class="text-center">No favorites added yet.</p>';
  }
}

function filterCategory(category, section) {
  currentCategory = category;
  if (section === 'source_codes') {
    sourceCodesPage = 1;
    displaySourceCodes();
  }
  if (section === 'blog') {
    blogPostsPage = 1;
    displayBlogPosts();
  }
}

function searchItems(query, section) {
  currentSearch = query;
  if (section === 'source_codes') {
    sourceCodesPage = 1;
    displaySourceCodes();
  }
  if (section === 'blog') {
    blogPostsPage = 1;
    displayBlogPosts();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initBackToTop();
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.onclick = e => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      if (section) showSection(section);
    };
  });
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.onclick = toggleDarkMode;
  }
  showSection('home');
});