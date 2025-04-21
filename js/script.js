const SOURCE_CODES_API = 'https://script.google.com/macros/s/AKfycbxSVWOpcvKb0i9TPU0Y9NKwlsqFP5qYDAaaQ6B3Qy4WehUknyvihvo3NNeXaSNJs4wtKQ/exec?action=source_codes';
const BLOG_POSTS_API = 'https://script.google.com/macros/s/AKfycbxSVWOpcvKb0i9TPU0Y9NKwlsqFP5qYDAaaQ6B3Qy4WehUknyvihvo3NNeXaSNJs4wtKQ/exec?action=blog_posts';

let sourceCodes = [];
let blogPosts = [];
let currentCategory = 'All';
let currentSearch = '';

function getLocalStore(key, defaultValue = {}) {
  return JSON.parse(localStorage.getItem(key)) || defaultValue;
}

function setLocalStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function toggleFavorite(itemId, type) {
  const favorites = getLocalStore('favorites');
  if (!favorites[type]) favorites[type] = [];
  const index = favorites[type].indexOf(itemId);
  if (index === -1) {
    favorites[type].push(itemId);
  } else {
    favorites[type].splice(index, 1);
  }
  setLocalStore('favorites', favorites);
  return index === -1;
}

function isFavorited(itemId, type) {
  const favorites = getLocalStore('favorites');
  return favorites[type]?.includes(itemId) || false;
}

function showSection(section) {
  document.querySelectorAll('#main-content > div').forEach(div => div.style.display = 'none');
  document.getElementById(`${section}-section`).style.display = 'block';
  
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  document.querySelector(`[data-section="${section}"]`).classList.add('active');

  currentCategory = 'All';
  currentSearch = '';
  if (section === 'source_codes') {
    loadSourceCodes();
    populateCategoryFilter('source_codes');
  }
  if (section === 'blog') {
    loadBlogPosts();
    populateCategoryFilter('blog');
  }
  if (section === 'favorites') loadFavorites();
  if (section === 'blog-detail') document.title = `CodeShare - Blog Detail`;
  else document.title = `CodeShare - ${section.charAt(0).toUpperCase() + section.slice(1)}`;
}

function populateCategoryFilter(section) {
  const categoryFilter = document.getElementById('category-filter');
  categoryFilter.innerHTML = '<option value="All">All</option>';
  
  const items = section === 'source_codes' ? sourceCodes : blogPosts;
  const categories = [...new Set(items.map(item => item.category))].sort();
  
  categories.forEach(category => {
    categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
  });
  
  categoryFilter.value = 'All';
  document.getElementById('search-bar').value = '';
}

function loadSourceCodes() {
  if (!sourceCodes.length) {
    fetch(SOURCE_CODES_API)
      .then(response => response.json())
      .then(data => {
        sourceCodes = data;
        populateCategoryFilter('source_codes');
        displaySourceCodes();
      })
      .catch(error => console.error('Error fetching source codes:', error));
  } else {
    populateCategoryFilter('source_codes');
    displaySourceCodes();
  }
}

function displaySourceCodes() {
  const codeList = document.getElementById('code-list');
  codeList.innerHTML = '';
  
  let filteredCodes = sourceCodes;
  if (currentCategory !== 'All') {
    filteredCodes = filteredCodes.filter(code => code.category === currentCategory);
  }
  if (currentSearch) {
    const searchLower = currentSearch.toLowerCase();
    filteredCodes = filteredCodes.filter(code => 
      code.title.toLowerCase().includes(searchLower) || 
      code.description.toLowerCase().includes(searchLower)
    );
  }
  
  if (filteredCodes.length === 0) {
    codeList.innerHTML = '<p class="text-center">No source codes found.</p>';
    return;
  }

  filteredCodes.forEach(code => {
    const downloadZipUrl = `${code.github_repo}/archive/refs/heads/main.zip`;
    const isFav = isFavorited(code.id, 'source_codes') ? 'active' : '';
    
    codeList.innerHTML += `
      <div class="col-md-4 mb-4">
        <div class="card">
          <img src="${code.thumbnail}" class="card-img-top" alt="${code.title}">
          <div class="card-body">
            <h5 class="card-title">${code.title}</h5>
            <p class="card-text">${code.description}</p>
            <p><strong>Category:</strong> ${code.category}</p>
            <p><strong>Author:</strong> ${code.author}</p>
            <p><strong>Date:</strong> ${code.date}</p>
            <a href="${code.demo}" class="btn btn-primary" target="_blank">Demo</a>
            <a href="${downloadZipUrl}" class="btn btn-download"><i class="fab fa-github"></i> Download ZIP</a>
            <button class="btn btn-favorite ${isFav}" onclick="toggleFavorite(${code.id}, 'source_codes'); displaySourceCodes()">
              <i class="fas fa-heart"></i> ${isFav ? 'Unfavorite' : 'Favorite'}
            </button>
          </div>
        </div>
      </div>
    `;
  });
}

function loadBlogPosts() {
  if (!blogPosts.length) {
    fetch(BLOG_POSTS_API)
      .then(response => response.json())
      .then(data => {
        blogPosts = data;
        populateCategoryFilter('blog');
        displayBlogPosts();
      })
      .catch(error => console.error('Error fetching blog posts:', error));
  } else {
    populateCategoryFilter('blog');
    displayBlogPosts();
  }
}

function displayBlogPosts() {
  const blogList = document.getElementById('blog-list');
  blogList.innerHTML = '';
  
  let filteredPosts = blogPosts;
  if (currentCategory !== 'All') {
    filteredPosts = filteredPosts.filter(post => post.category === currentCategory);
  }
  if (currentSearch) {
    const searchLower = currentSearch.toLowerCase();
    filteredPosts = filteredPosts.filter(post => 
      post.title.toLowerCase().includes(searchLower) || 
      post.content.toLowerCase().includes(searchLower)
    );
  }
  
  if (filteredPosts.length === 0) {
    blogList.innerHTML = '<p class="text-center">No blog posts found.</p>';
    return;
  }

  filteredPosts.forEach(post => {
    const isFav = isFavorited(post.id, 'blog_posts') ? 'active' : '';
    
    blogList.innerHTML += `
      <div class="col-md-4 mb-4">
        <div class="card">
          <img src="${post.thumbnail}" class="card-img-top" alt="${post.title}">
          <div class="card-body">
            <h5 class="card-title">${post.title}</h5>
            <p class="card-text">${post.content.substring(0, 100)}...</p>
            <p><strong>Category:</strong> ${post.category}</p>
            <p><strong>Author:</strong> ${post.author}</p>
            <p><strong>Date:</strong> ${post.date}</p>
            <a href="#" class="btn btn-primary" onclick="showBlogDetail(${post.id})">Read More</a>
            <button class="btn btn-favorite ${isFav}" onclick="toggleFavorite(${post.id}, 'blog_posts'); displayBlogPosts()">
              <i class="fas fa-heart"></i> ${isFav ? 'Unfavorite' : 'Favorite'}
            </button>
          </div>
        </div>
      </div>
    `;
  });
}

function showBlogDetail(postId) {
  const post = blogPosts.find(p => p.id === postId);
  if (!post) {
    const blogDetailContent = document.getElementById('blog-detail-content');
    blogDetailContent.innerHTML = '<p class="text-center">Blog post not found.</p>';
    showSection('blog-detail');
    return;
  }
  
  const blogDetailContent = document.getElementById('blog-detail-content');
  const isFav = isFavorited(post.id, 'blog_posts') ? 'active' : '';
  
  blogDetailContent.innerHTML = `
    <div class="blog-detail">
      <h2>${post.title}</h2>
      <img src="${post.thumbnail}" alt="${post.title}">
      <p><strong>Category:</strong> ${post.category}</p>
      <p><strong>Author:</strong> ${post.author}</p>
      <p><strong>Date:</strong> ${post.date}</p>
      <p>${post.content}</p>
      <button class="btn btn-favorite ${isFav}" onclick="toggleFavorite(${post.id}, 'blog_posts'); showBlogDetail(${post.id})">
        <i class="fas fa-heart"></i> ${isFav ? 'Unfavorite' : 'Favorite'}
      </button>
      <a href="#" class="btn btn-back" onclick="showSection('blog')">Back to Blog</a>
    </div>
  `;
  
  showSection('blog-detail');
}

function loadFavorites() {
  const favoritesList = document.getElementById('favorites-list');
  favoritesList.innerHTML = '';
  const favorites = getLocalStore('favorites');

  if (favorites.source_codes?.length) {
    const favCodes = sourceCodes.filter(code => favorites.source_codes.includes(code.id));
    favCodes.forEach(code => {
      const downloadZipUrl = `${code.github_repo}/archive/refs/heads/main.zip`;
      favoritesList.innerHTML += `
        <div class="col-md-4 mb-4">
          <div class="card">
            <img src="${code.thumbnail}" class="card-img-top" alt="${code.title}">
            <div class="card-body">
              <h5 class="card-title">${code.title}</h5>
              <p class="card-text">${code.description}</p>
              <p><strong>Category:</strong> ${code.category}</p>
              <p><strong>Author:</strong> ${code.author}</p>
              <p><strong>Date:</strong> ${code.date}</p>
              <a href="${code.demo}" class="btn btn-primary" target="_blank">Demo</a>
              <a href="${downloadZipUrl}" class="btn btn-download"><i class="fab fa-github"></i> Download ZIP</a>
              <button class="btn btn-favorite active" onclick="toggleFavorite(${code.id}, 'source_codes'); loadFavorites()">
                <i class="fas fa-heart"></i> Unfavorite
              </button>
            </div>
          </div>
        </div>
      `;
    });
  }

  if (favorites.blog_posts?.length) {
    const favPosts = blogPosts.filter(post => favorites.blog_posts.includes(post.id));
    favPosts.forEach(post => {
      favoritesList.innerHTML += `
        <div class="col-md-4 mb-4">
          <div class="card">
            <img src="${post.thumbnail}" class="card-img-top" alt="${post.title}">
            <div class="card-body">
              <h5 class="card-title">${post.title}</h5>
              <p class="card-text">${post.content.substring(0, 100)}...</p>
              <p><strong>Category:</strong> ${post.category}</p>
              <p><strong>Author:</strong> ${post.author}</p>
              <p><strong>Date:</strong> ${post.date}</p>
              <a href="#" class="btn btn-primary" onclick="showBlogDetail(${post.id})">Read More</a>
              <button class="btn btn-favorite active" onclick="toggleFavorite(${post.id}, 'blog_posts'); loadFavorites()">
                <i class="fas fa-heart"></i> Unfavorite
              </button>
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
  if (section === 'source_codes') displaySourceCodes();
  if (section === 'blog') displayBlogPosts();
}

function searchItems(query, section) {
  currentSearch = query;
  if (section === 'source_codes') displaySourceCodes();
  if (section === 'blog') displayBlogPosts();
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const section = e.target.getAttribute('data-section');
    showSection(section);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const categoryFilter = document.getElementById('category-filter');
  const searchBar = document.getElementById('search-bar');
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', e => {
      const section = document.querySelector('.nav-link.active').getAttribute('data-section');
      filterCategory(e.target.value, section);
    });
  }
  
  if (searchBar) {
    searchBar.addEventListener('input', e => {
      const section = document.querySelector('.nav-link.active').getAttribute('data-section');
      searchItems(e.target.value, section);
    });
  }
});

showSection('source_codes');