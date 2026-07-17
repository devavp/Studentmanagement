import { useState } from "react";
import api from "../../api";
import { localInputToIso } from "../../utils/date";

export default function UploadDocument() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [requiresSubmission, setRequiresSubmission] = useState(false);
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function resetForm(form) {
    setTitle("");
    setDescription("");
    setFile(null);
    setRequiresSubmission(false);
    setHasDueDate(false);
    setDueDate("");
    form.reset();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!file) return setError("Please choose a PDF or DOCX file");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("file", file);
    formData.append("requires_submission", requiresSubmission ? "true" : "false");
    if (requiresSubmission && hasDueDate) {
      formData.append("due_date", localInputToIso(dueDate));
    }

    try {
      await api.post("/staff/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(
        requiresSubmission
          ? "Assessment published — students can now submit their completed work."
          : "Document uploaded successfully — visible to your department's students."
      );
      resetForm(e.target);
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    }
  }

  return (
    <div className="page">
      <h1>Upload Document</h1>
      <p className="subtitle">Only PDF or DOCX. Visible to all students in your department.</p>
      {message && <div className="success-box">{message}</div>}
      {error && <div className="error-box">{error}</div>}
      <form className="card-form" onSubmit={handleSubmit}>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label>Description (optional)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

        <label>File (PDF or DOCX)</label>
        <input type="file" accept=".pdf,.docx" onChange={(e) => setFile(e.target.files[0])} required />

        <div className="option-block">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={requiresSubmission}
              onChange={(e) => setRequiresSubmission(e.target.checked)}
            />
            <span>
              Students must submit work for this
              <span className="option-hint">
                For an assessment or test questions — students upload their completed work against it.
              </span>
            </span>
          </label>

          {requiresSubmission && (
            <div className="option-nested">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={hasDueDate}
                  onChange={(e) => setHasDueDate(e.target.checked)}
                />
                <span>
                  Set a due date
                  <span className="option-hint">
                    Leave this off if there's no deadline — then nobody is ever marked late.
                  </span>
                </span>
              </label>

              {hasDueDate && (
                <>
                  <label>Due date &amp; time</label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </>
              )}
            </div>
          )}
        </div>

        <button type="submit">{requiresSubmission ? "Publish Assessment" : "Upload"}</button>
      </form>
    </div>
  );
}
