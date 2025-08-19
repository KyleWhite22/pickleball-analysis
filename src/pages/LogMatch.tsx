import { useState } from "react";

export default function LogMatch() {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [score, setScore] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: call backend API to save match
    console.log("Submitting match:", { teamA, teamB, score });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Log Match</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block font-medium">Team A</label>
          <input
            value={teamA}
            onChange={(e) => setTeamA(e.target.value)}
            className="border p-2 w-full"
            placeholder="Player1, Player2"
          />
        </div>
        <div>
          <label className="block font-medium">Team B</label>
          <input
            value={teamB}
            onChange={(e) => setTeamB(e.target.value)}
            className="border p-2 w-full"
            placeholder="Player3, Player4"
          />
        </div>
        <div>
          <label className="block font-medium">Score</label>
          <input
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="border p-2 w-full"
            placeholder="11-8, 9-11, 11-7"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Save Match
        </button>
      </form>
    </div>
  );
}
