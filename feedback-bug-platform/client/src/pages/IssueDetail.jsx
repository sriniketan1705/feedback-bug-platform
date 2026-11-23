import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchIssue,
  fetchTeam,
  updateIssue,
  toggleVote,
  deleteIssue,
  clearCurrent,
} from '../features/issuesSlice';
import Badge from '../components/Badge';

export default function IssueDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current: issue, team, loading, error } = useSelector((s) => s.issues);
  const user = useSelector((s) => s.auth.user);

  useEffect(() => {
    dispatch(fetchIssue(id));
    dispatch(fetchTeam());
    return () => dispatch(clearCurrent());
  }, [id, dispatch]);

  if (loading && !issue) return <p className="muted">Loading...</p>;
  if (error && !issue) return <div className="alert error">{error}</div>;
  if (!issue) return null;

  const change = (changes) => dispatch(updateIssue({ id: issue._id, changes }));
  const voted = issue.votes?.includes(user?.id);
  const info = issue.pageInfo || {};

  const handleDelete = async () => {
    if (window.confirm('Delete this issue permanently?')) {
      const res = await dispatch(deleteIssue(issue._id));
      if (!res.error) navigate('/');
    }
  };

  return (
    <>
      <Link to="/" className="muted">← Back to dashboard</Link>

      <div className="detail-grid">
        {/* LEFT: report content */}
        <div className="card">
          <div className="issue-meta">
            <Badge kind="type" value={issue.type} />
            <Badge kind="severity" value={issue.severity} />
            <Badge kind="status" value={issue.status} />
            <span className="badge plain">{issue.category}</span>
          </div>
          <h2>{issue.title}</h2>
          <p className="description">{issue.description}</p>

          <div className="ai-box">
            <b>🤖 AI analysis</b>{' '}
            <span className="muted small-text">
              ({issue.aiSource === 'gemini' ? 'Generative AI' : 'rule-based fallback'})
            </span>
            <p>{issue.aiSummary || 'No summary available.'}</p>
            {issue.duplicateOf && (
              <p>
                ⚠️ Looks like a duplicate of{' '}
                <Link to={`/issues/${issue.duplicateOf._id}`}>{issue.duplicateOf.title}</Link>{' '}
                <span className="muted">({issue.duplicateOf.status})</span>
              </p>
            )}
          </div>

          <h3>Reporter</h3>
          <p className="muted">
            {issue.reporterName || 'Anonymous'}
            {issue.reporterEmail ? ` · ${issue.reporterEmail}` : ''}
            <br />
            Reported on {new Date(issue.createdAt).toLocaleString()}
          </p>

          {issue.screenshot && (
            <>
              <h3>Screenshot</h3>
              <img className="screenshot" src={issue.screenshot} alt="Screenshot of the reported page" />
            </>
          )}
        </div>

        {/* RIGHT: management panel */}
        <div>
          <div className="card">
            <h3>Manage</h3>

            <label>Status</label>
            <select value={issue.status} onChange={(e) => change({ status: e.target.value })}>
              <option value="open">Open</option>
              <option value="in-progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <label>Assigned to</label>
            <select
              value={issue.assignedTo?._id || ''}
              onChange={(e) => change({ assignedTo: e.target.value })}
            >
              <option value="">Unassigned</option>
              {team.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>

            <label>Severity</label>
            <select value={issue.severity} onChange={(e) => change({ severity: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <button
              className={`btn full ${voted ? '' : 'ghost'}`}
              style={{ marginTop: 14 }}
              onClick={() => dispatch(toggleVote(issue._id))}
            >
              ▲ {voted ? 'Voted' : 'Vote'} · {issue.votes?.length || 0}
            </button>

            {user?.role === 'admin' && (
              <button className="btn full danger" style={{ marginTop: 8 }} onClick={handleDelete}>
                Delete issue
              </button>
            )}
          </div>

          <div className="card">
            <h3>Page details</h3>
            <dl className="details">
              <dt>URL</dt>
              <dd>{info.url ? <a href={info.url} target="_blank" rel="noreferrer">{info.url}</a> : '—'}</dd>
              <dt>Page title</dt>
              <dd>{info.title || '—'}</dd>
              <dt>Screen</dt>
              <dd>{info.screen || '—'}</dd>
              <dt>Viewport</dt>
              <dd>{info.viewport || '—'}</dd>
              <dt>Language</dt>
              <dd>{info.language || '—'}</dd>
              <dt>Browser</dt>
              <dd className="break">{info.userAgent || '—'}</dd>
              <dt>Referrer</dt>
              <dd className="break">{info.referrer || '—'}</dd>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
