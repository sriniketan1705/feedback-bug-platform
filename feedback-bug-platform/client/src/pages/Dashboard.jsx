import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchIssues, fetchStats, toggleVote } from '../features/issuesSlice';
import StatCards from '../components/StatCards';
import Badge from '../components/Badge';
import { API_URL } from '../app/api';

const initialFilters = { search: '', status: '', type: '', severity: '', assigned: '', sort: '' };

export default function Dashboard() {
  const dispatch = useDispatch();
  const { list, stats, loading, error } = useSelector((s) => s.issues);
  const user = useSelector((s) => s.auth.user);
  const [filters, setFilters] = useState(initialFilters);

  // Reload the list whenever a filter changes (small delay while typing in search)
  useEffect(() => {
    const t = setTimeout(() => dispatch(fetchIssues(filters)), 300);
    return () => clearTimeout(t);
  }, [filters, dispatch]);

  useEffect(() => {
    dispatch(fetchStats());
  }, [dispatch, list.length]);

  const onChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  return (
    <>
      <div className="page-head">
        <h2>Dashboard</h2>
        <a className="btn small ghost" href={`${API_URL}/demo.html`} target="_blank" rel="noreferrer">
          Open widget demo page ↗
        </a>
      </div>

      <StatCards stats={stats} />

      <div className="card filters">
        <input name="search" placeholder="Search issues..." value={filters.search} onChange={onChange} />
        <select name="status" value={filters.status} onChange={onChange}>
          <option value="">All status</option>
          <option value="open">Open</option>
          <option value="in-progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select name="type" value={filters.type} onChange={onChange}>
          <option value="">All types</option>
          <option value="bug">Bug</option>
          <option value="feedback">Feedback</option>
          <option value="feature">Feature</option>
        </select>
        <select name="severity" value={filters.severity} onChange={onChange}>
          <option value="">All severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select name="assigned" value={filters.assigned} onChange={onChange}>
          <option value="">Everyone</option>
          <option value="me">Assigned to me</option>
        </select>
        <select name="sort" value={filters.sort} onChange={onChange}>
          <option value="">Newest first</option>
          <option value="votes">Most voted</option>
        </select>
        <button className="btn small ghost" onClick={() => setFilters(initialFilters)}>Reset</button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading && list.length === 0 && <p className="muted">Loading issues...</p>}
      {!loading && list.length === 0 && (
        <div className="card center muted">
          No issues yet. Open the widget demo page and submit a report!
        </div>
      )}

      <div className="issue-list">
        {list.map((issue) => {
          const voted = issue.votes?.includes(user?.id);
          return (
            <div key={issue._id} className="card issue-row">
              <button
                className={`vote ${voted ? 'voted' : ''}`}
                onClick={() => dispatch(toggleVote(issue._id))}
                title="Vote for this issue"
              >
                ▲
                <span>{issue.voteCount ?? issue.votes?.length ?? 0}</span>
              </button>

              <div className="issue-main">
                <Link to={`/issues/${issue._id}`} className="issue-title">{issue.title}</Link>
                <div className="issue-meta">
                  <Badge kind="type" value={issue.type} />
                  <Badge kind="severity" value={issue.severity} />
                  <Badge kind="status" value={issue.status} />
                  {issue.duplicateOf && <span className="badge dup">possible duplicate</span>}
                  {issue.hasScreenshot && <span className="badge plain">📷 screenshot</span>}
                </div>
                {issue.aiSummary && <p className="ai-summary">🤖 {issue.aiSummary}</p>}
              </div>

              <div className="issue-side muted small-text">
                <div>{issue.assignedTo ? `👤 ${issue.assignedTo.name}` : 'Unassigned'}</div>
                <div>{new Date(issue.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
