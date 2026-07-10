const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { Server } = require('socket.io');

const DB_FILE = path.join(__dirname, 'db.json');
const adapter = new FileSync(DB_FILE);
const db = low(adapter);

db.defaults({
  candidates: [],
    config: { lat: null, lng: null, radiusMeters: 0, votingOpen: true, title: 'Live Vote' },
      voters: []
      }).write();

      const app = express();
      const server = http.createServer(app);
      const io = new Server(server);

      app.use(express.json());
      app.use(cookieParser());
      app.use(express.static(path.join(__dirname, 'public')));

      app.use((req, res, next) => {
        if (!req.cookies.voterId) {
            const voterId = uuidv4();
                res.cookie('voterId', voterId, {
                      maxAge: 1000 * 60 * 60 * 24 * 30,
                            httpOnly: true,
                                  sameSite: 'lax'
                                      });
                                          req.voterId = voterId;
                                            } else {
                                                req.voterId = req.cookies.voterId;
                                                  }
                                                    next();
                                                    });

                                                    function haversineMeters(lat1, lon1, lat2, lon2) {
                                                      const R = 6371000;
                                                        const toRad = (d) => (d * Math.PI) / 180;
                                                          const dLat = toRad(lat2 - lat1);
                                                            const dLon = toRad(lon2 - lon1);
                                                              const a =
                                                                  Math.sin(dLat / 2) ** 2 +
                                                                      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
                                                                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                                                          return R * c;
                                                                          }

                                                                          function publicState(req) {
                                                                            const config = db.get('config').value();
                                                                              const candidates = db.get('candidates').value();
                                                                                const hasVoted = db.get('voters').value().includes(req.voterId);
                                                                                  return {
                                                                                      title: config.title,
                                                                                          votingOpen: config.votingOpen,
                                                                                              locationRequired: !!(config.lat && config.lng && config.radiusMeters > 0),
                                                                                                  hasVoted,
                                                                                                      candidates: candidates.map((c) => ({ id: c.id, name: c.name, photo: c.photo || '', votes: c.votes }))
                                                                                                        };
                                                                                                        }
                                                                                                        
                                                                                                        app.get('/api/state', (req, res) => {
                                                                                                          res.json(publicState(req));
                                                                                                          });
                                                                                                          
                                                                                                          app.post('/api/vote', (req, res) => {
                                                                                                            const config = db.get('config').value();
                                                                                                              const { candidateId, lat, lng } = req.body;
                                                                                                              
                                                                                                                if (!config.votingOpen) {
                                                                                                                    return res.status(403).json({ error: 'La votación está cerrada.' });
                                                                                                                      }
                                                                                                                      
                                                                                                                        const voters = db.get('voters').value();
                                                                                                                          if (voters.includes(req.voterId)) {
                                                                                                                              return res.status(409).json({ error: 'Ya has votado desde este dispositivo.' });
                                                                                                                                }
                                                                                                                                
                                                                                                                                  const candidate = db.get('candidates').find({ id: candidateId }).value();
                                                                                                                                    if (!candidate) {
                                                                                                                                        return res.status(400).json({ error: 'Candidato inválido.' });
                                                                                                                                          }
                                                                                                                                          
                                                                                                                                            if (config.lat && config.lng && config.radiusMeters > 0) {
                                                                                                                                                if (typeof lat !== 'number' || typeof lng !== 'number') {
                                                                                                                                                      return res.status(428).json({ error: 'Se requiere tu ubicación para votar.' });
                                                                                                                                                          }
                                                                                                                                                              const distance = haversineMeters(lat, lng, config.lat, config.lng);
                                                                                                                                                                  if (distance > config.radiusMeters) {
                                                                                                                                                                        return res.status(403).json({ error: 'Estás fuera del área permitida para votar.' });
                                                                                                                                                                            }
                                                                                                                                                                              }
                                                                                                                                                                              
                                                                                                                                                                                db.get('candidates').find({ id: candidateId }).assign({ votes: candidate.votes + 1 }).write();
                                                                                                                                                                                  db.get('voters').push(req.voterId).write();
                                                                                                                                                                                  
                                                                                                                                                                                    const updated = db.get('candidates').value();
                                                                                                                                                                                      io.emit('results', updated.map((c) => ({ id: c.id, name: c.name, photo: c.photo || '', votes: c.votes })));
                                                                                                                                                                                      
                                                                                                                                                                                        res.json({ ok: true });
                                                                                                                                                                                        });
                                                                                                                                                                                        
                                                                                                                                                                                        app.get('/api/admin/state', (req, res) => {
                                                                                                                                                                                          res.json({
                                                                                                                                                                                              config: db.get('config').value(),
                                                                                                                                                                                                  candidates: db.get('candidates').value(),
                                                                                                                                                                                                      totalVotes: db.get('voters').value().length
                                                                                                                                                                                                        });
                                                                                                                                                                                                        });
                                                                                                                                                                                                        
                                                                                                                                                                                                        const MAX_CANDIDATES = 9;
                                                                                                                                                                                                        
                                                                                                                                                                                                        app.post('/api/admin/candidates', (req, res) => {
                                                                                                                                                                                                          const { name, photo } = req.body;
                                                                                                                                                                                                            if (!name || !name.trim()) return res.status(400).json({ error: 'Nombre requerido.' });
                                                                                                                                                                                                              if (db.get('candidates').value().length >= MAX_CANDIDATES) {
                                                                                                                                                                                                                  return res.status(400).json({ error: `Máximo ${MAX_CANDIDATES} participantes.` });
                                                                                                                                                                                                                    }
                                                                                                                                                                                                                      const candidate = { id: uuidv4(), name: name.trim(), photo: photo || '', votes: 0 };
                                                                                                                                                                                                                        db.get('candidates').push(candidate).write();
                                                                                                                                                                                                                          broadcastResults();
                                                                                                                                                                                                                            res.json(candidate);
                                                                                                                                                                                                                            });
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            app.put('/api/admin/candidates/:id', (req, res) => {
                                                                                                                                                                                                                              const { name, photo } = req.body;
                                                                                                                                                                                                                                const candidate = db.get('candidates').find({ id: req.params.id });
                                                                                                                                                                                                                                  if (!candidate.value()) return res.status(404).json({ error: 'No encontrado.' });
                                                                                                                                                                                                                                    candidate.assign({ ...(name ? { name } : {}), ...(photo !== undefined ? { photo } : {}) }).write();
                                                                                                                                                                                                                                      broadcastResults();
                                                                                                                                                                                                                                        res.json(candidate.value());
                                                                                                                                                                                                                                        });
                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                        app.delete('/api/admin/candidates/:id', (req, res) => {
                                                                                                                                                                                                                                          db.get('candidates').remove({ id: req.params.id }).write();
                                                                                                                                                                                                                                            broadcastResults();
                                                                                                                                                                                                                                              res.json({ ok: true });
                                                                                                                                                                                                                                              });
                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                              app.post('/api/admin/config', (req, res) => {
                                                                                                                                                                                                                                                const { lat, lng, radiusMeters, votingOpen, title } = req.body;
                                                                                                                                                                                                                                                  const patch = {};
                                                                                                                                                                                                                                                    if (lat !== undefined) patch.lat = lat === null ? null : Number(lat);
                                                                                                                                                                                                                                                      if (lng !== undefined) patch.lng = lng === null ? null : Number(lng);
                                                                                                                                                                                                                                                        if (radiusMeters !== undefined) patch.radiusMeters = Number(radiusMeters);
                                                                                                                                                                                                                                                          if (votingOpen !== undefined) patch.votingOpen = !!votingOpen;
                                                                                                                                                                                                                                                            if (title !== undefined) patch.title = title;
                                                                                                                                                                                                                                                              db.get('config').assign(patch).write();
                                                                                                                                                                                                                                                                res.json(db.get('config').value());
                                                                                                                                                                                                                                                                });
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                app.post('/api/admin/reset-votes', (req, res) => {
                                                                                                                                                                                                                                                                  db.get('candidates').forEach((c) => (c.votes = 0)).write();
                                                                                                                                                                                                                                                                    db.set('voters', []).write();
                                                                                                                                                                                                                                                                      broadcastResults();
                                                                                                                                                                                                                                                                        res.json({ ok: true });
                                                                                                                                                                                                                                                                        });
                                                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                                                        function broadcastResults() {
                                                                                                                                                                                                                                                                          const updated = db.get('candidates').value();
                                                                                                                                                                                                                                                                            io.emit('results', updated.map((c) => ({ id: c.id, name: c.name, photo: c.photo || '', votes: c.votes })));
                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                            const PORT = process.env.PORT || 3000;
                                                                                                                                                                                                                                                                            server.listen(PORT, () => {
                                                                                                                                                                                                                                                                              console.log(`Servidor de votación escuchando en puerto ${PORT}`);
                                                                                                                                                                                                                                                                              });
                                                                                                                                                                                                                                                                              
