import { useState, useEffect } from 'react';
import { Plus, Folder, Film, Trash2, Edit2, MoreVertical } from 'lucide-react';

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedCollection, setSelectedCollection] = useState(null);

  useEffect(() => { loadCollections(); }, []);

  const loadCollections = () => {
    const stored = localStorage.getItem('streamvault_collections');
    if (stored) { setCollections(JSON.parse(stored)); } 
    else {
      const demo = [
        { id: 1, name: 'Favorite Sci-Fi', movies: [{ id: 101, title: 'Inception', year: 2010, poster: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', rating: 8.8 }], createdAt: '2024-01-10', updatedAt: '2024-01-15' },
        { id: 2, name: 'Classic Movies', movies: [], createdAt: '2024-01-12', updatedAt: '2024-01-12' }
      ];
      setCollections(demo);
      localStorage.setItem('streamvault_collections', JSON.stringify(demo));
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    const newCol = { id: Date.now(), name: newCollectionName, movies: [], createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0] };
    const updated = [...collections, newCol];
    setCollections(updated);
    localStorage.setItem('streamvault_collections', JSON.stringify(updated));
    setNewCollectionName('');
    setShowCreateModal(false);
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this collection?')) return;
    const updated = collections.filter(c => c.id !== id);
    setCollections(updated);
    localStorage.setItem('streamvault_collections', JSON.stringify(updated));
  };

  return (
    <div className='netflix-collections-page'><div className='collections-header'><div className='header-content'><h1>My Collections</h1><p>Organize your favorite movies</p><button className='netflix-btn netflix-btn-primary' onClick={() => setShowCreateModal(true)}><Plus size={20}/>Create Collection</button></div></div><div className='collections-grid'>{collections.map((col) => <div key={col.id} className='collection-card'><div className='collection-header'><div className='collection-icon'><Folder size={24}/></div><div className='collection-info'><h3>{col.name}</h3><p>{col.movies.length} movies</p></div><div className='collection-actions'><button className='action-btn' onClick={() => setSelectedCollection(col.id === selectedCollection ? null : col.id)}><MoreVertical size={20}/></button>{selectedCollection === col.id && <div className='action-menu'><button><Edit2 size={16}/>Rename</button><button onClick={() => handleDelete(col.id)}><Trash2 size={16}/>Delete</button></div>}</div></div>{col.movies.length > 0 ? <div className='collection-movies'>{col.movies.map((m) => <div key={m.id} className='collection-movie-card'><img src={m.poster} alt={m.title}/><div className='movie-overlay'><div className='movie-info'><h4>{m.title}</h4><p>{m.year}</p></div></div></div>)}</div> : <div className='collection-empty'><Film size={48}/><p>No movies yet</p></div>}<div className='collection-footer'><span>Updated {col.updatedAt}</span></div></div>)}</div>{showCreateModal && <div className='netflix-modal-overlay' onClick={() => setShowCreateModal(false)}><div className='netflix-modal' onClick={(e) => e.stopPropagation()}><div className='modal-header'><h2>Create Collection</h2><button className='modal-close' onClick={() => setShowCreateModal(false)}></button></div><form onSubmit={handleCreate}><div className='modal-body'><label>Collection Name</label><input type='text' placeholder='e.g., Action Movies' value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} autoFocus/></div><div className='modal-footer'><button type='button' className='netflix-btn netflix-btn-secondary' onClick={() => setShowCreateModal(false)}>Cancel</button><button type='submit' className='netflix-btn netflix-btn-primary'>Create</button></div></form></div></div>}</div>
  );
}
