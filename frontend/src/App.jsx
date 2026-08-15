import React, { useState, useEffect, useCallback } from 'react';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const API_BASE = '/api';

  // Проверяем токен при старте
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsLoggedIn(true);
  }, []);

  // Функция для получения заголовков с токеном
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/notes`, { headers: getHeaders() });
      const json = await res.json();
      setNotes(json.data);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) loadNotes();
  }, [isLoggedIn, loadNotes]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const json = await res.json();
      
      if (res.ok) {
        if (authMode === 'register') {
          const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const loginJson = await loginRes.json();
          localStorage.setItem('token', loginJson.token);
        } else {
          localStorage.setItem('token', json.token);
        }
        setIsLoggedIn(true);
        setPassword('');
      } else {
        setAuthError(json.error || 'Ошибка');
      }
    } catch (err) {
      setAuthError('Сервер недоступен');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setNotes([]);
    setSelectedNote(null);
  };

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    
    if (q.length === 0) {
      setSearchResults(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`, { headers: getHeaders() });
      const json = await res.json();
      setSearchResults(json.data);
    } catch (err) {
      console.error('Ошибка поиска:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, content })
    });
    
    setTitle('');
    setContent('');
    setIsModalOpen(false);
    loadNotes();
  };

  const handleDelete = async (id) => {
    await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (selectedNote?.id === id) setSelectedNote(null);
    loadNotes();
  };

  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1 className="auth-title">Smart Notes</h1>
          <p className="auth-subtitle">Вход в систему</p>
          
          <form onSubmit={handleAuth}>
            <input
              type="text"
              className="auth-input"
              placeholder="Логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              className="auth-input"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {authError && <div className="auth-error">{authError}</div>}
            
            <button type="submit" className="btn-primary btn-block">
              {authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>
          
          <p className="auth-switch">
            {authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <span onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? 'Создать' : 'Войти'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  const displayedNotes = searchResults !== null ? searchResults : notes;
  const sortedNotes = [...displayedNotes].sort((a, b) => {
    if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'ru');
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">Smart Notes</h1>
        <div className="header-actions">
          <span className="user-name">{username}</span>
          <button className="btn-logout" onClick={handleLogout}>Выйти</button>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Добавить</button>
        </div>
      </header>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Поиск по заметкам, тегам, контексту..."
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>

      <div className="sort-bar">
        <span className="sort-label">Сортировка:</span>
        <button className={sortBy === 'date_desc' ? 'sort-btn active' : 'sort-btn'} onClick={() => setSortBy('date_desc')}>Сначала новые</button>
        <button className={sortBy === 'date_asc' ? 'sort-btn active' : 'sort-btn'} onClick={() => setSortBy('date_asc')}>Сначала старые</button>
        <button className={sortBy === 'title_asc' ? 'sort-btn active' : 'sort-btn'} onClick={() => setSortBy('title_asc')}>По алфавиту</button>
      </div>

      <div className="main-layout">
        <div className="notes-list">
          {sortedNotes.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? 'Ничего не найдено' : 'Нет заметок. Нажми "+ Добавить"'}
            </div>
          ) : (
            sortedNotes.map(note => (
              <div 
                key={note.id} 
                className={`list-item ${selectedNote?.id === note.id ? 'selected' : ''}`}
                onClick={() => setSelectedNote(note)}
              >
                <div className="list-item-header">
                  <span className="list-item-title">{note.title}</span>
                  <span className="list-item-date">{new Date(note.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="list-item-tags">
                  {note.tags?.slice(0, 3).map(tag => (
                    <span key={tag} className="tag-mini">#{tag}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="note-detail">
          {selectedNote ? (
            <>
              <div className="note-detail-header">
                <h2>{selectedNote.title}</h2>
                <button className="btn-delete" onClick={() => handleDelete(selectedNote.id)}>✕</button>
              </div>
              <div className="note-detail-date">
                Создано: {new Date(selectedNote.created_at).toLocaleString('ru-RU')}
              </div>
              <p className="note-detail-content">{selectedNote.content}</p>
              <div className="note-tags">
                {selectedNote.tags?.map(tag => (
                  <span key={tag} className="tag">#{tag}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">Выбери заметку слева, чтобы прочитать её</div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Новая заметка</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <input
                className="input-title"
                placeholder="Тема заметки"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
              <textarea
                className="input-content"
                placeholder="Что нового? Пишите #теги прямо в тексте"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                required
              />
              <button type="submit" className="btn-primary btn-block">Сохранить</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
