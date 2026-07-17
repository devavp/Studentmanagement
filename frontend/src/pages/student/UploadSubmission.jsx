import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api";
import { formatDueDate, dueRelative, parseUtc } from "../../utils/date";

const GENERAL = "general";

export default function UploadSubmission() {
  const [searchParams] = useSearchParams();
  const [assessments, setAssessments] = useState([]);
  // Preselected when arriving from a "Submit" link on the documents page.
  const [documentId, setDocumentId] = useState(searchParams.get("document") || GENERAL);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/student/documents").then((res) => {
      const open = res.data.filter((d) => d.requires_submission);
      setAssessments(open);

      // Title defaults to the assessment's own title.
      const preselected = open.find((d) => String(d.id) === searchParams.get("document"));
      if (preselected) setTitle(preselected.title);
    });
  }, [searchParams]);

  const selected = assessments.find((d) => String(d.id) === String(documentId)) || null;
  const isOverdue = selected?.due_date ? parseUtc(selected.due_date) < new Date() : false;

  function handleAssessmentChange(value) {
    setDocumentId(value);
    const next = assessments.find((d) => String(d.id) === value);
    setTitle(next ? next.title : "");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!file) return setError("Please choose a PDF or DOCX file");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);
    if (documentId !== GENERAL) formData.append("document_id", documentId);

    try {
      const res = await api.post("/student/submissions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(
        res.data.is_late
          ? "Submission uploaded, but it was after the due date — it will show as Late to your staff."
          : "Submission uploaded — your department's staff can now view it."
      );
      setTitle("");
      setFile(null);
      setDocumentId(GENERAL);
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    }
  }

  return (
    <div className="page">
      <h1>Upload Submission</h1>
      <p className="subtitle">Only PDF or DOCX. Visible to your department's staff.</p>
      {message && <div className="success-box">{message}</div>}
      {error && <div className="error-box">{error}</div>}
      <form className="card-form" onSubmit={handleSubmit}>
        <label>What is this for?</label>
        <select value={documentId} onChange={(e) => handleAssessmentChange(e.target.value)}>
          <option value={GENERAL}>General submission (not an assessment)</option>
          {assessments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
              {d.due_date ? ` — due ${formatDueDate(d.due_date)}` : " — no due date"}
            </option>
          ))}
        </select>

        {selected?.due_date && (
          <div className={isOverdue ? "error-box" : "info-note"}>
            {isOverdue
              ? `This assessment was due ${formatDueDate(selected.due_date)} (${dueRelative(
                  selected.due_date
                )}). You can still submit, but it will be marked Late.`
              : `Due ${formatDueDate(selected.due_date)} — ${dueRelative(selected.due_date)}.`}
          </div>
        )}

        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label>File (PDF or DOCX)</label>
        <input type="file" accept=".pdf,.docx" onChange={(e) => setFile(e.target.files[0])} required />

        <button type="submit">Upload</button>
      </form>
    </div>
  );
}
