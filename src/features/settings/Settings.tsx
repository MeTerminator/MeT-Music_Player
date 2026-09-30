import { useState, type FormEvent } from 'react';
import { readSessionId, saveSessionId } from '../../shared/session';
import './settings.css';

export default function Settings() {
  const [sessionId, setSessionId] = useState(readSessionId);
  const [message, setMessage] = useState('输入 Session ID 后保存');

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      saveSessionId(sessionId);
      setMessage(sessionId.trim() ? '已保存 Session ID' : '已清除 Session ID');
    } catch {
      setMessage('保存失败，请检查浏览器存储权限');
    }
  };

  return (
    <main className="settings-card">
      <h1>MeT-Music Player</h1>
      <p>设置用于远程同步的 Session ID。</p>
      <form onSubmit={save}>
        <label htmlFor="sid">Session ID</label>
        <input id="sid" name="sid" value={sessionId} onChange={event => setSessionId(event.target.value)} autoComplete="off" />
        <button type="submit">保存</button>
      </form>
      <p role="status">{message}</p>
      <a href={import.meta.env.BASE_URL}>返回播放器</a>
    </main>
  );
}

