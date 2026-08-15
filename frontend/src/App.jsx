import React, { useState, useEffect, useCallback } from 'react';

function App() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  
  // Состояния для формы
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const API_BASE = '/api';

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/notes`);
      const json = await res.json();
      setNotes(json.data);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
    
    setTitle('');
    setContent('');
    setIsModalOpen(false);
    loadNotes();
  };

  const handleDelete = async (id) => {
    await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
    if (selectedNote?.id === id) setSelectedNote(null);
    loadNotes();
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'ru');
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="app-shell">
      {/* ШАПКА */}
      <header className="app-header">
        <h1 className="app-title">Smart Notes</h1>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Добавить</button>
      </header>

      {/* ПАНЕЛЬ СОРТИРОВКИ */}
      <div className="sort-bar">
        <span className="sort-label">Сортировка:</span>
        <button className={sortBy === 'date_desc' ? 'sort-btn active' : 'sort-btn'} onClick={() => setSortBy('date_desc')}>Сначала новые</button>
        <button className={sortBy === 'date_asc' ? 'sort-btn active' : 'sort-btn'} onClick={() => setSortBy('date_asc')}>Сначала старые</button>
        <button className={sortBy === 'title_asc' ? 'sort-btn active' : 'sort-btn'} onClick={() => setSortBy('title_asc')}>По алфавиту</button>
      </div>

      {/* ОСНОВНОЙ КОНТЕНТ: Слева список, справа превью */}
      <div className="main-layout">
        {/* ЛЕВАЯ КОЛОНКА (Список заметок) */}
        <div className="notes-list">
          {sortedNotes.length === 0 ? (
            <div className="empty-state">Нет заметок. Нажми "+ Добавить"</div>
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

        {/* ПРАВАЯ КОЛОНКА (Полный просмотр) */}
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

      {/* МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ */}
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
