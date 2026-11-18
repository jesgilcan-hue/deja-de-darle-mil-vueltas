// Widget compartido de encuestas en 1 clic con sincronización global en Firestore (y respaldo local)
(function () {
  const PROJECT_ID = 'editorialmenosruido';
  const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

  async function fetchRemoteCounts(pollId) {
    try {
      const res = await fetch(`${BASE_URL}/polls/${encodeURIComponent(pollId)}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      const fields = data?.fields || {};
      const out = {};
      for (const [k, v] of Object.entries(fields)) {
        out[k] = Number(v?.integerValue || v?.doubleValue || 0);
      }
      return out;
    } catch {
      return null;
    }
  }

  async function incrementRemoteVote(pollId, optionId) {
    try {
      const docName = `projects/${PROJECT_ID}/databases/(default)/documents/polls/${pollId}`;
      const res = await fetch(`${BASE_URL}:commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writes: [
            {
              transform: {
                document: docName,
                fieldTransforms: [
                  {
                    fieldPath: optionId,
                    increment: { integerValue: '1' }
                  }
                ]
              }
            }
          ]
        })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  window.initEditorialPoll = async function initEditorialPoll({
    pollId,
    storageKey,
    options,
    containerId,
    totalId
  }) {
    const wrap = document.getElementById(containerId);
    const totalEl = document.getElementById(totalId);
    if (!wrap || !totalEl || !Array.isArray(options)) return;

    let votedId = localStorage.getItem(storageKey) || '';
    let remoteCounts = null;
    let isSubmitting = false;

    function getCounts() {
      return options.map(opt => {
        const base = Number(opt.base || 0);
        if (remoteCounts) {
          return base + Number(remoteCounts[opt.id] || 0);
        }
        return base + (votedId === opt.id ? 1 : 0);
      });
    }

    function render() {
      const counts = getCounts();
      const total = counts.reduce((a, b) => a + b, 0);
      wrap.innerHTML = '';

      options.forEach((opt, idx) => {
        const count = counts[idx];
        const pct = total ? Math.round((count / total) * 100) : 0;
        const isMine = votedId === opt.id;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.disabled = Boolean(votedId) || isSubmitting;
        btn.style.cssText = `position:relative;overflow:hidden;width:100%;text-align:left;padding:0.78rem 0.95rem;border-radius:10px;border:${isMine ? '2px solid #87553b' : '1px solid #d8cfc1'};background:#ffffff;color:#1f1c19;font-family:inherit;font-size:0.93rem;font-weight:${isMine ? '700' : '600'};cursor:${votedId ? 'default' : 'pointer'};display:flex;justify-content:space-between;align-items:center;gap:10px;`;

        if (votedId) {
          const bar = document.createElement('span');
          bar.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:${isMine ? 'rgba(135,85,59,0.16)' : 'rgba(31,28,25,0.06)'};pointer-events:none;transition:width .3s ease;`;
          btn.appendChild(bar);
        }

        const txt = document.createElement('span');
        txt.style.cssText = 'position:relative;z-index:1;';
        txt.textContent = (isMine ? '✓ ' : '') + opt.label;
        btn.appendChild(txt);

        if (votedId) {
          const stat = document.createElement('span');
          stat.style.cssText = `position:relative;z-index:1;font-weight:800;font-size:0.88rem;color:${isMine ? '#87553b' : '#5e5347'};white-space:nowrap;`;
          stat.textContent = `${pct}% (${count})`;
          btn.appendChild(stat);
        }

        if (!votedId) {
          btn.addEventListener('click', async () => {
            if (votedId || isSubmitting) return;
            isSubmitting = true;
            votedId = opt.id;
            localStorage.setItem(storageKey, votedId);
            if (remoteCounts) {
              remoteCounts[opt.id] = Number(remoteCounts[opt.id] || 0) + 1;
            }
            render();
            const ok = await incrementRemoteVote(pollId, opt.id);
            if (ok) {
              const refreshed = await fetchRemoteCounts(pollId);
              if (refreshed) remoteCounts = refreshed;
              render();
            }
            isSubmitting = false;
          });
        }

        wrap.appendChild(btn);
      });

      totalEl.textContent = votedId
        ? `${total} votos registrados · Gracias por votar.`
        : `${total} personas han votado · Toca una opción para ver los resultados.`;
    }

    render();
    const fetched = await fetchRemoteCounts(pollId);
    if (fetched) {
      remoteCounts = fetched;
      render();
    }
  };
})();
