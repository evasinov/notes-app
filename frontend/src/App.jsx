import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

function NoteEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false
      }),
      CodeBlockLowlight.configure({ lowlight })
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    }
  });

  if (!editor) return null;

  return (
    <div className="editor-wrapper">
      <div className="editor-toolbar">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className="toolbar-btn">B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className="toolbar-btn">I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className="toolbar-btn">S</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="toolbar-btn">H1</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="toolbar-btn">H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className="toolbar-btn">•</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className="toolbar-btn">1.</button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className="toolbar-btn">&lt;/&gt;</button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="toolbar-btn">—</button>
      </div>
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [tagsStats, setTagsStats] = useState([]);
  const [activeTag, setActiveTag] = useState(null);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  
  const tagCloudRef = useRef(null);

  const API_BASE = '/api';

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    if (token) {
      setIsLoggedIn(true);
      if (savedUsername) setUsername(savedUsername);
    }
  }, []);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/notes`, { headers: getAuthHeader() });
      const json = await res.json();
      const loadedNotes = json.data || [];
      setNotes(loadedNotes);
      
      if (loadedNotes.length > 0 && !selectedNote) {
        setSelectedNote(loadedNotes[0]);
      }
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    }
  }, []);

  const loadTagsStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tags/stats`, { headers: getAuthHeader() });
      const json = await res.json();
      setTagsStats(json.data || []);
    } catch (err) {
      console.error('Ошибка загрузки тегов:', err);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadNotes();
      loadTagsStats();
    }
  }, [isLoggedIn, loadNotes, loadTagsStats]);

  const handleMouseMove = (e) => {
    if (!tagCloudRef.current) return;
    const rect = tagCloudRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    const tags = tagCloudRef.current.querySelectorAll('.tag-cloud-item');
    tags.forEach((tag, index) => {
      const speed = 0.02 + (index % 3) * 0.01;
      const moveX = x * speed;
      const moveY = y * speed;
      tag.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
  };

  const handleTagClick = (tag) => {
    if (activeTag === tag) {
      setActiveTag(null);
    } else {
      setActiveTag(tag);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

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
          localStorage.setItem('username', loginJson.user.username);
        } else {
          localStorage.setItem('token', json.token);
          localStorage.setItem('username', json.user.username);
        }
        setIsLoggedIn(true);
        setUsername(json.user?.username || username);
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
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    setNotes([]);
    setSelectedNote(null);
    setTagsStats([]);
    setActiveTag(null);
  };

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    
    if (q.length === 0) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`, { headers: getAuthHeader() });
      const json = await res.json();
      setSearchResults(json.data || []);
    } catch (err) {
      console.error('Ошибка поиска:', err);
      setSearchResults([]);
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
    loadTagsStats();
  };

  const handleEditClick = () => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setIsEditModalOpen(true);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    await fetch(`${API_BASE}/notes/${selectedNote.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ title: editTitle, content: editContent })
    });
    
    setIsEditModalOpen(false);
    loadNotes();
    loadTagsStats();
  };

  const handleDelete = async (id) => {
    await fetch(`${API_BASE}/notes/${id}`, { 
      method: 'DELETE', 
      headers: getAuthHeader()
    });
    setSelectedNote(null);
    setIsDeleteConfirm(false);
    loadNotes();
    loadTagsStats();
  };

  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '16px' }}>
            <div className="logo-icon">📝</div>
            <div className="logo-text">
              <span className="logo-title">Smart Notes</span>
              <span className="logo-subtitle">Insight Hub</span>
            </div>
          </div>
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

  const filteredNotes = activeTag
    ? notes.filter(note => note.tags?.includes(activeTag))
    : notes;

  const displayedNotes = searchQuery.length > 0 ? searchResults : filteredNotes;
  const sortedNotes = [...displayedNotes].sort((a, b) => {
    if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'ru');
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const maxTagCount = Math.max(...tagsStats.map(t => t.count), 1);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">📝</div>
          <div className="logo-text">
            <span className="logo-title">Smart Notes</span>
            <span className="logo-subtitle">Insight Hub</span>
          </div>
        </div>
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

      {tagsStats.length > 0 && (
        <div className="tag-cloud-container" ref={tagCloudRef} onMouseMove={handleMouseMove}>
          {tagsStats.map((tag, index) => {
            const size = 14 + (tag.count / maxTagCount) * 20;
            return (
              <span
                key={tag.tag}
                className={`tag-cloud-item ${activeTag === tag.tag ? 'active' : ''}`}
                style={{ fontSize: `${size}px` }}
                onClick={() => handleTagClick(tag.tag)}
              >
                #{tag.tag}
              </span>
            );
          })}
          {activeTag && (
            <button className="tag-clear" onClick={() => setActiveTag(null)}>
              ✕ Сбросить
            </button>
          )}
        </div>
      )}

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
              {searchQuery ? 'Ничего не найдено' : activeTag ? `Нет заметок с тегом #${activeTag}` : 'Нет заметок. Нажми "+ Добавить"'}
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
                <div className="note-actions">
                  <button className="btn-edit" onClick={handleEditClick}>✎</button>
                  <button className="btn-delete" onClick={() => setIsDeleteConfirm(true)}>✕</button>
                </div>
              </div>
              <div className="note-detail-date">
                Создано: {new Date(selectedNote.created_at).toLocaleString('ru-RU')}
              </div>
              <div className="note-detail-content" dangerouslySetInnerHTML={{ __html: selectedNote.content }} />
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
          <div className="modal wide-modal" onClick={(e) => e.stopPropagation()}>
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
              <NoteEditor content="" onChange={setContent} />
              <button type="submit" className="btn-primary btn-block">Сохранить</button>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Редактирование</h3>
              <button className="btn-close" onClick={() => setIsEditModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <input
                className="input-title"
                placeholder="Тема"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                autoFocus
              />
              <NoteEditor content={editContent} onChange={setEditContent} />
              <button type="submit" className="btn-primary btn-block">Сохранить</button>
            </form>
          </div>
        </div>
      )}

      {isDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setIsDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Подтверждение</h3>
              <button className="btn-close" onClick={() => setIsDeleteConfirm(false)}>✕</button>
            </div>
            <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
              Вы уверены, что хотите удалить заметку "{selectedNote?.title}"?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-primary" onClick={() => handleDelete(selectedNote.id)}>
                Удалить
              </button>
              <button className="btn-cancel" onClick={() => setIsDeleteConfirm(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
