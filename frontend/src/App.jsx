import React, { useState, useEffect } from 'react';

function App() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const API_BASE = '/api';

  // Загружаем заметки при старте
  const loadNotes = async () => {
    try {
      const res = await fetch(`${API_BASE}/notes`);
      const json = await res.json();
      setNotes(json.data);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  // Создание заметки
  const handleSubmit = async (e) => {
    e.preventDefault();
    const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    
    await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, tags: tagsArray })
    });
    
    setTitle('');
    setContent('');
    setTags('');
    loadNotes();
  };

  return (
    <div className="app-shell">
      {/* Панель быстрого добавления */}
      <div className="quick-add">
        <form onSubmit={handleSubmit}>
          <input
            className="input-title"
            placeholder="Тема заметки"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="input-content"
            placeholder="Что нового? (Теги через запятую: важно, баг, идея)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <input
            className="input-tags"
            placeholder="Теги (через запятую)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <button type="submit" className="btn-primary">Добавить заметку</button>
        </form>
      </div>

      {/* Лента заметок */}
      <div className="notes-feed">
        {notes.length === 0 ? (
          <div className="empty-state">Пока пусто. Добавь первую заметку!</div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="note-card">
              <div className="note-header">
                <h3>{note.title}</h3>
                <span className="note-date">{new Date(note.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              <p>{note.content}</p>
              <div className="note-tags">
                {note.tags?.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;

