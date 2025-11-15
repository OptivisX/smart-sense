import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import axios from 'axios';
import './App.css';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let rowCounter = 0;
const nextRowId = () => {
  rowCounter += 1;
  return `row-${rowCounter}`;
};

const badgeClassForStatus = (status) => {
  const tone = (status || '').toString().toLowerCase();
  if (!tone) return 'badge-info';
  if (['high', 'urgent', 'critical'].includes(tone)) {
    return 'badge-error';
  }
  if (['medium', 'normal'].includes(tone)) {
    return 'badge-warning';
  }
  if (['low'].includes(tone)) {
    return 'badge-success';
  }
  if (
    tone.includes('ship') ||
    tone.includes('delivered') ||
    tone.includes('complete') ||
    tone.includes('success')
  ) {
    return 'badge-success';
  }
  if (
    tone.includes('return') ||
    tone.includes('process') ||
    tone.includes('pending') ||
    tone.includes('await') ||
    tone.includes('hold')
  ) {
    return 'badge-warning';
  }
  if (
    tone.includes('fail') ||
    tone.includes('error') ||
    tone.includes('cancel') ||
    tone.includes('issue')
  ) {
    return 'badge-error';
  }
  if (tone.includes('live') || tone.includes('active')) {
    return 'badge-active';
  }
  return 'badge-info';
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatTimestampLabel = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

function App() {
  const [joined, setJoined] = useState(false);
  const [localTrack, setLocalTrack] = useState(null);
  const [agentId, setAgentId] = useState(null);
  const [customerId, setCustomerId] = useState('aman');
  const [status, setStatus] = useState('Ready to connect');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [orderRows, setOrderRows] = useState([]);
  const [ticketRows, setTicketRows] = useState([]);
  const [insightSummary, setInsightSummary] = useState('');
  const [rawInsight, setRawInsight] = useState('');
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [wsError, setWsError] = useState(null);

  const intervalRef = useRef(null);
  const audioLevelIntervalRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (joined && intervalRef.current === null) {
      intervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (!joined && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setCallDuration(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [joined]);

  useEffect(() => {
    if (localTrack && !isMuted) {
      audioLevelIntervalRef.current = setInterval(() => {
        const level = localTrack.getVolumeLevel();
        setAudioLevel(Math.min(level * 100, 100));
      }, 100);
    } else {
      setAudioLevel(0);
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
    }

    return () => {
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
    };
  }, [localTrack, isMuted]);

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3005/ws/structured-data';
    setWsStatus('Connecting');
    setWsError(null);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('Connected');
        setWsError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'structured_data') {
            const payload = data.payload || {};
            const structuredOrders = payload.structured?.orders || [];
            const structuredTickets = payload.structured?.tickets || [];
            setInsightSummary(payload.plainText || '');
            setOrderRows(
              structuredOrders.map((order) => ({
                id: order.orderId || nextRowId(),
                orderId: order.orderId || 'N/A',
                item: order.summary || '—',
                status: order.status || 'Pending',
                total: order.total,
                currency: order.currency,
                timestamp: order.updatedAt || data.timestamp || new Date().toISOString()
              }))
            );
            setTicketRows(
              structuredTickets.map((ticket) => ({
                id: ticket.ticketId || nextRowId(),
                ticketId: ticket.ticketId || 'N/A',
                summary: ticket.summary || '—',
                priority: ticket.priority || 'normal',
                status: ticket.status || 'open',
                timestamp: ticket.lastUpdated || data.timestamp || new Date().toISOString()
              }))
            );
            let prettyRaw = '';
            if (payload.rawJson) {
              try {
                const parsedRaw = JSON.parse(payload.rawJson);
                prettyRaw = JSON.stringify(parsedRaw, null, 2);
              } catch (parseErr) {
                prettyRaw = payload.rawJson;
              }
            } else if (payload.structured) {
              prettyRaw = JSON.stringify(payload.structured, null, 2);
            } else {
              prettyRaw = JSON.stringify(payload, null, 2);
            }
            setRawInsight(prettyRaw);
          } else {
            console.warn('Received unsupported websocket payload:', data);
          }
        } catch (err) {
          console.error('Failed to parse websocket message', err);
        }
      };

      ws.onerror = () => {
        setWsStatus('Error');
        setWsError('Live data stream encountered an issue.');
      };

      ws.onclose = () => {
        setWsStatus('Disconnected');
      };
    } catch (err) {
      console.error('WebSocket setup failed', err);
      setWsStatus('Error');
      setWsError('Unable to establish live data stream.');
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const startCall = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setStatus('Initializing AI agent...');
      setCustomerProfile(null);

      const res = await axios.post('http://localhost:4000/api/session', {
        customerId
      });

      const { appId, channelName, token, uid, agentId: aId } = res.data;
      setAgentId(aId);
      setCustomerProfile(res.data.customerProfile || null);
      console.log('Session created:', { appId, channelName, uid, agentId: aId });

      client.removeAllListeners();

      client.on('user-joined', (user) => {
        console.log('🟢 User joined channel:', user.uid);
        setStatus('AI agent connected');
      });

      client.on('user-left', (user) => {
        console.log('🔴 User left channel:', user.uid);
        setStatus('AI agent disconnected');
      });

      client.on('user-published', async (user, mediaType) => {
        console.log('🎙️ User published:', user.uid, 'mediaType:', mediaType);
        if (mediaType === 'audio') {
          try {
            await client.subscribe(user, mediaType);
            const audioTrack = user.audioTrack;
            if (audioTrack) {
              audioTrack.play();
              setStatus('AI agent is speaking');
            }
          } catch (err) {
            console.error('❌ Failed to subscribe/play audio:', err);
            setError('Failed to connect audio');
          }
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        console.log('🔇 User unpublished:', user.uid, 'mediaType:', mediaType);
        if (mediaType === 'audio') {
          setStatus('Connected - waiting for response');
        }
      });

      setStatus('Connecting to channel...');
      await client.join(appId, channelName, token || null, uid || null);

      const remoteUsers = client.remoteUsers;

      if (remoteUsers.length === 0) {
        setStatus('Waiting for AI agent...');
      }

      for (const remoteUser of remoteUsers) {
        if (remoteUser.hasAudio) {
          try {
            await client.subscribe(remoteUser, 'audio');
            remoteUser.audioTrack.play();
            setStatus('AI agent is speaking');
          } catch (err) {
            console.error('❌ Failed to subscribe to existing user audio:', err);
            setError('Failed to connect to existing audio');
          }
        }
      }

      setStatus('Setting up microphone...');
      const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
      setLocalTrack(micTrack);
      await client.publish([micTrack]);

      setJoined(true);
      setIsLoading(false);
      setStatus('Connected - Start speaking!');
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setError(err.response?.data?.error || err.message || 'Failed to start session');
      setStatus('Connection failed');
    }
  };

  const endCall = async () => {
    try {
      setIsLoading(true);
      setStatus('Ending call...');

      if (localTrack) {
        localTrack.stop();
        localTrack.close();
        setLocalTrack(null);
      }

      await client.leave();
      setJoined(false);
      setIsMuted(false);
      setStatus('Call ended');

      if (agentId) {
        try {
          await axios.post('http://localhost:4000/api/stop', { agentId });
        } catch (err) {
          console.error('Error stopping agent:', err);
        }
        setAgentId(null);
      }

      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setError('Error ending call');
    }
  };

  const toggleMute = () => {
    if (localTrack) {
      if (isMuted) {
        localTrack.setMuted(false);
        setIsMuted(false);
        setStatus('Microphone unmuted');
      } else {
        localTrack.setMuted(true);
        setIsMuted(true);
        setStatus('Microphone muted');
      }
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">🎧</div>
            <h1>SmartSense Command</h1>
          </div>
          <p className="tagline">Live Intelligence for Premium Customer Support</p>
        </div>
      </header>

      <main className="app-main">
        <section className="card hero-card">
          <div className="hero-text">
            <h2>Operations Console</h2>
            <p>
              Manage your AI voice agent and monitor key operational signals in one streamlined workspace.
            </p>
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">Session</span>
              <h3>{joined ? 'Live Voice Support' : 'Standby'}</h3>
              <p>{status}</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Call Duration</span>
              <h3>{joined ? formatTime(callDuration) : '--:--'}</h3>
              <p>Audio level: {audioLevel.toFixed(0)}%</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Data Stream</span>
              <h3>{wsStatus}</h3>
              <p>
                {wsError
                  ? wsError
                  : orderRows.length || ticketRows.length
                    ? `${orderRows.length} orders · ${ticketRows.length} tickets`
                    : 'Secure websocket feed'}
              </p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Customer</span>
              <h3>{customerProfile?.name || 'Awaiting session'}</h3>
              <p>{customerProfile?.tier ? `${customerProfile.tier} Member` : 'Enter an ID to begin'}</p>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="card call-card">
            <div className="section-header">
              <h3>Voice Control Center</h3>
              <p>Connect or wrap up a live SmartSense engagement.</p>
            </div>

            <div className="input-group">
              <label htmlFor="customerId">Customer Identifier</label>
              <input
                id="customerId"
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="Enter or scan customer ID"
                disabled={isLoading || joined}
                className="input-field"
              />
            </div>

            <div className="call-status">
              <div>
                <p className="status-label">Assistant state</p>
                <h4>{status}</h4>
              </div>
              {callDuration > 0 && joined && (
                <div className="call-timer">
                  <span className="timer-icon">⏱️</span>
                  {formatTime(callDuration)}
                </div>
              )}
            </div>

            <div className="audio-meter">
              <div className="meter-label">
                <span>Microphone activity</span>
                <span>{audioLevel.toFixed(0)}%</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${audioLevel}%` }}></div>
              </div>
            </div>

            {error && (
              <div className="error-message subtle">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="control-buttons wide">
              {!joined ? (
                <button
                  onClick={startCall}
                  disabled={isLoading || !customerId.trim()}
                  className="btn btn-primary btn-large"
                >
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🎙️</span>
                      Start Session
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={toggleMute}
                    className={`btn btn-icon-only ${isMuted ? 'muted' : ''}`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? '🔇' : '🎤'}
                  </button>
                  <button
                    onClick={endCall}
                    className="btn btn-danger"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner"></span>
                        Ending...
                      </>
                    ) : (
                      <>
                        <span className="btn-icon">📞</span>
                        End Session
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            <div className="session-details">
              <div>
                <p className="detail-label">Agent ID</p>
                <p className="detail-value">{agentId?.slice(0,5) || 'Pending'}</p>
              </div>
              <div>
                <p className="detail-label">Customer</p>
                <p className="detail-value">
                  {customerProfile?.name || 'N/A'} {customerProfile?.orders?.length ? `· ${customerProfile.orders.length} orders` : ''}
                </p>
              </div>
              <div>
                <p className="detail-label">Tier</p>
                <p className="detail-value">{customerProfile?.tier || 'Standard'}</p>
              </div>
            </div>
          </section>

          <section className="card data-card">
            <div className="section-header">
              <div>
                <h3>Live Operational Feed</h3>
                <p>Structured order updates streamed directly from the AI assistant.</p>
              </div>
              <span className={`status-chip ${wsStatus.toLowerCase()}`}>{wsStatus}</span>
            </div>

            {insightSummary ? (
              <div className="insight-summary">
                <span className="summary-label">Narrative</span>
                <p>{insightSummary}</p>
              </div>
            ) : (
              <div className="insight-summary muted">
                <span className="summary-label">Narrative</span>
                <p>Waiting for the assistant to publish a summary.</p>
              </div>
            )}

            <div className="data-section">
              <div className="table-wrapper">
                <div className="table-section-header">
                  <span>Orders</span>
                  <span className="section-meta">
                    {orderRows.length ? `${orderRows.length} record${orderRows.length > 1 ? 's' : ''}` : 'No records'}
                  </span>
                </div>
                {orderRows.length ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Item</th>
                        <th>Status</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <p className="table-title">{row.orderId}</p>
                          </td>
                          <td>
                            <p className="table-title">{row.item}</p>
                            {row.total != null && (
                              <p className="table-subtitle">
                                {row.currency ? `${row.currency} ` : ''}
                                {Number.isFinite(row.total) ? row.total.toFixed(2) : row.total}
                              </p>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${badgeClassForStatus(row.status)}`}>{row.status}</span>
                          </td>
                          <td className="table-timestamp">{formatTimestampLabel(row.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state small">
                    <div className="empty-icon">📦</div>
                    <p>No order updates yet</p>
                    <small>Incoming structured data will automatically populate the latest orders.</small>
                  </div>
                )}
              </div>

              {ticketRows.length ? (
                <div className="table-wrapper">
                  <div className="table-section-header">
                    <span>Support Tickets</span>
                    <span className="section-meta">
                      {ticketRows.length} ticket{ticketRows.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Summary</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketRows.map((ticket) => (
                        <tr key={ticket.id}>
                          <td>
                            <p className="table-title">{ticket.ticketId}</p>
                          </td>
                          <td>
                            <p className="table-title">{ticket.summary}</p>
                          </td>
                          <td>
                            <span className={`badge ${badgeClassForStatus(ticket.priority)}`}>{ticket.priority}</span>
                          </td>
                          <td>
                            <span className={`badge ${badgeClassForStatus(ticket.status)}`}>{ticket.status}</span>
                          </td>
                          <td className="table-timestamp">{formatTimestampLabel(ticket.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            {rawInsight && (
              <div className="raw-json-block">
                <div className="raw-json-header">
                  <span>Raw JSON</span>
                  <span className="raw-json-meta">Latest payload preview</span>
                </div>
                <pre className="raw-json">{rawInsight}</pre>
              </div>
            )}

            {wsError && (
              <div className="error-message subtle">
                <span className="error-icon">⚠️</span>
                {wsError}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <p>&copy; 2024 SmartSense. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
