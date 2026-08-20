import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Mention from '@tiptap/extension-mention';
import { common, createLowlight } from 'lowlight';
import ForceGraph2D from 'react-force-graph-2d';
import { PluginKey } from '@tiptap/pm/state';

const lowlight = createLowlight(common);

// Плагин для подсказок тегов
const TagSuggestion = Mention.extend({
  name: 'tagSuggestion',
}).configure({
  suggestion: {
    char: '#',
    pluginKey: new PluginKey('tagSuggestion'),
    items: ({ query }) => {
      // Возвращаем теги (будем передавать через пропсы)
      return [];
    },
  },
});

function NoteEditor({ content, onChange, availableTags }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Mention.configure({
        HTMLAttributes: { class: 'mention-tag' },
        suggestion: {
          char: '#',
          pluginKey: new PluginKey('tagSuggestion'),
          items: ({ query }) => {
            const filtered = (availableTags || [])
              .filter(tag => tag.toLowerCase().startsWith(query.toLowerCase()))
              .slice(0, 10);
            return filtered;
          },
          render: () => {
            let popup;
            return {
              onStart: (props) => {
                popup = document.createElement('div');
                popup.className = 'tag-suggestion-popup';
                popup.style.position = 'fixed';
                document.body.appendChild(popup);
                renderPopup(props);
              },
              onUpdate: (props) => {
                if (props.clientRect) {
                  const rect = props.clientRect();
                  popup.style.left = rect.left + 'px';
                  popup.style.top = (rect.bottom + 5) + 'px';
                }
                renderPopup(props);
              },
              onKeyDown: (props) => {
                if (props.event.key === 'Escape') {
                  popup.remove();
                  return true;
                }
                return false;
              },
              onExit: () => {
                if (popup) popup.remove();
              },
            };

            function renderPopup(props) {
              if (!popup) return;
              if (props.items.length === 0) {
                popup.style.display = 'none';
                return;
              }
              popup.style.display = 'block';
              popup.innerHTML = '';
              
              props.items.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = `tag-suggestion-item ${index === props.selectedIndex ? 'selected' : ''}`;
                div.textContent = `#${item}`;
                div.addEventListener('click', () => {
                  props.command({ id: item });
                });
                popup.appendChild(div);
              });
            }
          },
        },
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
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

function ResizableModal({ isOpen, onClose, title, children }) {
  const [size, setSize] = useState({ width: 600, height: 500 });
  const startPos = useRef(null);
  const startSize = useRef(null);
  const resizeFlag = useRef(false);

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizeFlag.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { ...size };
    
    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startPos.current.x;
      const dy = moveEvent.clientY - startPos.current.y;
      
      const newWidth = Math.max(500, Math.min(startSize.current.width + dx, window.innerWidth * 0.95));
      const newHeight = Math.max(400, Math.min(startSize.current.height + dy, window.innerHeight * 0.9));
      
      setSize({ width: newWidth, height: newHeight });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setTimeout(() => { resizeFlag.current = false; }, 300);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget && !resizeFlag.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div 
        className="modal resizable-dynamic" 
        style={{ width: `${size.width}px`, height: `${size.height}px` }}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        {children}
        <div className="resize-handle" onMouseDown={handleResizeStart} />
      </div>
    </div>
  );
}

function GraphModal({ isOpen, onClose, graphData }) {
  if (!isOpen) return null;

  const formattedData = {
    nodes: (graphData.nodes || []).map(n => ({
      id: String(n.id),
      title: n.title,
      val: 2
    })),
    links: (graphData.links || []).map(l => ({
      source: String(l.source_note_id || l.source),
      target: String(l.target_note_id || l.target)
    }))
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal graph-modal">
        <div className="modal-header">
          <h3>Граф связей</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="graph-container">
          <ForceGraph2D
            graphData={formattedData}
            nodeLabel="title"
            nodeColor={() => '#E35205'}
            nodeRelSize={5}
            linkColor={() => 'rgba(227, 82, 5, 0.6)'}
            linkWidth={2}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            backgroundColor="#1a1a1a"
            width={800}
            height={600}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const size = 4;
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
              ctx.fillStyle = '#E35205';
              ctx.fill();
              
              // Обрезаем длинные названия
              let label = node.title || '';
              const maxLength = 25;
              if (label.length > maxLength) {
                label = label.substring(0, maxLength) + '...';
              }
              
              const fontSize = 11 / globalScale;
              ctx.font = `500 ${fontSize}px Inter, -apple-system, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#f5f5f5';
              ctx.fillText(label, node.x, node.y - 12);
            }}
          />
        </div>
      </div>
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
  const [pinnedNoteId, setPinnedNoteId] = useState(null);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [dateFilter, setDateFilter] = useState('all');
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  
  const tagCloudRef = useRef(null);
  const debounceTimer = useRef(null);

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
      
      setSelectedNote(prev => {
        if (prev && loadedNotes.find(n => n.id === prev.id)) {
          return prev;
        }
        if (loadedNotes.length > 0) {
          return loadedNotes[0];
        }
        return null;
      });
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

  const loadGraphData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/notes/graph`, { headers: getAuthHeader() });
      const json = await res.json();
      setGraphData(json.data || { nodes: [], links: [] });
    } catch (err) {
      console.error('Ошибка загрузки графа:', err);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadNotes();
      loadTagsStats();
      loadGraphData();
    }
  }, [isLoggedIn, loadNotes, loadTagsStats, loadGraphData]);

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

  const handleTogglePin = async (id) => {
    await fetch(`${API_BASE}/notes/${id}/pin`, { 
      method: 'PATCH', 
      headers: getAuthHeader()
    });
    
    setPinnedNoteId(id);
    setTimeout(() => setPinnedNoteId(null), 800);
    
    loadNotes();
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

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    if (q.length === 0) {
      setSearchResults([]);
      return;
    }
    
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`, { headers: getAuthHeader() });
        const json = await res.json();
        setSearchResults(json.data || []);
      } catch (err) {
        console.error('Ошибка поиска:', err);
        setSearchResults([]);
      }
    }, 500);
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
    loadGraphData();
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
    
    const currentNoteId = selectedNote?.id;
    
    const res = await fetch(`${API_BASE}/notes/${currentNoteId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ title: editTitle, content: editContent })
    });
    
    const json = await res.json();
    
    setIsEditModalOpen(false);
    
    if (json.data) {
      setSelectedNote(json.data);
    }
    
    const token = localStorage.getItem('token');
    const notesRes = await fetch(`${API_BASE}/notes`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    });
    const notesJson = await notesRes.json();
    setNotes(notesJson.data || []);
    
    loadTagsStats();
    loadGraphData();
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
    loadGraphData();
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

  const filterByDate = (notesList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    switch (dateFilter) {
      case 'today':
        return notesList.filter(n => new Date(n.created_at) >= today);
      case 'yesterday':
        return notesList.filter(n => {
          const d = new Date(n.created_at);
          return d >= yesterday && d < today;
        });
      case 'week':
        return notesList.filter(n => new Date(n.created_at) >= weekAgo);
      case 'month':
        return notesList.filter(n => new Date(n.created_at) >= monthAgo);
      default:
        return notesList;
    }
  };

  const filteredNotes = filterByDate(
    activeTag
      ? notes.filter(note => note.tags?.includes(activeTag))
      : notes
  );

  const displayedNotes = searchQuery.length > 0 ? searchResults : filteredNotes;
  const sortedNotes = [...displayedNotes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'ru');
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const maxTagCount = Math.max(...tagsStats.map(t => t.count), 1);
  const availableTags = tagsStats.map(t => t.tag);

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
          <button className="btn-graph" onClick={() => {
            loadGraphData();
            setIsGraphOpen(true);
          }}>🕸 Граф</button>
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
          onChange={handleSearchChange}
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

      <div className="date-filter-bar">
        <span className="sort-label">Период:</span>
        <button className={dateFilter === 'all' ? 'sort-btn active' : 'sort-btn'} onClick={() => setDateFilter('all')}>Все</button>
        <button className={dateFilter === 'today' ? 'sort-btn active' : 'sort-btn'} onClick={() => setDateFilter('today')}>Сегодня</button>
        <button className={dateFilter === 'yesterday' ? 'sort-btn active' : 'sort-btn'} onClick={() => setDateFilter('yesterday')}>Вчера</button>
        <button className={dateFilter === 'week' ? 'sort-btn active' : 'sort-btn'} onClick={() => setDateFilter('week')}>Неделя</button>
        <button className={dateFilter === 'month' ? 'sort-btn active' : 'sort-btn'} onClick={() => setDateFilter('month')}>Месяц</button>
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
                className={`list-item ${selectedNote?.id === note.id ? 'selected' : ''} ${pinnedNoteId === note.id ? 'pinned-animate' : ''}`}
                onClick={() => setSelectedNote(note)}
              >
                <div className="list-item-header">
                  <span className="list-item-title">
                    {note.is_pinned && <span className="pin-indicator">📌</span>}
                    {note.title}
                  </span>
                  <span className="list-item-date">{new Date(note.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="list-item-preview">
                  {note.content ? note.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim() : 'Нет содержимого'}
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
              <div className="note-detail-actions-bar">
                <button 
                  className="btn-pin" 
                  onClick={() => handleTogglePin(selectedNote.id)}
                  title={selectedNote.is_pinned ? 'Открепить' : 'Закрепить'}
                  style={{ opacity: selectedNote.is_pinned ? 1 : 0.5 }}
                >
                  📌
                </button>
                <button className="btn-edit" onClick={handleEditClick}>✎</button>
                <button className="btn-delete" onClick={() => setIsDeleteConfirm(true)}>✕</button>
              </div>
              <h2 className="note-detail-title">{selectedNote.title}</h2>
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

      <ResizableModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Новая заметка">
        <form onSubmit={handleSubmit}>
          <input
            className="input-title"
            placeholder="Тема заметки"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
          <NoteEditor content="" onChange={setContent} availableTags={availableTags} />
          <button type="submit" className="btn-primary btn-block">Сохранить</button>
        </form>
      </ResizableModal>

      <ResizableModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Редактирование">
        <form onSubmit={handleEditSubmit}>
          <input
            className="input-title"
            placeholder="Тема"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
            autoFocus
          />
          <NoteEditor content={editContent} onChange={setEditContent} availableTags={availableTags} />
          <button type="submit" className="btn-primary btn-block">Сохранить</button>
        </form>
      </ResizableModal>

      <GraphModal isOpen={isGraphOpen} onClose={() => setIsGraphOpen(false)} graphData={graphData} />

      {isDeleteConfirm && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setIsDeleteConfirm(false);
        }}>
          <div className="modal">
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
