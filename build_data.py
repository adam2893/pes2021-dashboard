#!/usr/bin/env python3
"""
Build script to extract project data and generate JSON for the GitHub Pages dashboard.
Run from the project root: python3 docs/build_data.py
"""

import json
import re
import os
import sqlite3
from pathlib import Path
from datetime import datetime
from collections import defaultdict

PROJECT_ROOT = Path(__file__).parent.parent

def parse_findings_md():
    """Parse FINDINGS.md into structured entries."""
    findings_path = PROJECT_ROOT / "FINDINGS.md"
    content = findings_path.read_text()
    
    entries = []
    # Split by date headers (## YYYY-MM-DD:)
    sections = re.split(r'\n## (\d{4}-\d{2}-\d{2}):\s*(.+?)\n', content)
    
    for i in range(1, len(sections), 3):
        date_str = sections[i]
        title = sections[i+1].strip()
        body = sections[i+2] if i+2 < len(sections) else ""
        
        # Parse track from body
        track_match = re.search(r'Track:\s*([A-C])', body)
        track = track_match.group(1) if track_match else "?"
        
        # Extract confidence markers
        confirmed = len(re.findall(r'\*\*confirmed\*\*', body))
        probable = len(re.findall(r'\*\*probable\*\*', body))
        guess = len(re.findall(r'\*\*guess\*\*', body))
        
        # Extract key findings (lines with **confirmed**/**probable**/**guess**)
        key_findings = re.findall(r'^\s*[-*]\s+.+?(?:\*\*confirmed\*\*|\*\*probable\*\*|\*\*guess\*\*)', body, re.MULTILINE)
        
        entries.append({
            "date": date_str,
            "title": title,
            "track": track,
            "body": body[:5000],  # Truncate for JSON size
            "confidence_counts": {"confirmed": confirmed, "probable": probable, "guess": guess},
            "key_findings": key_findings[:20]
        })
    
    return entries

def parse_seeds_tsv(tsv_path):
    """Parse a seeds TSV file."""
    if not tsv_path.exists():
        return []
    
    rows = []
    content = tsv_path.read_text()
    lines = content.strip().split('\n')
    
    for line in lines:
        if line.startswith('#') or not line.strip():
            continue
        parts = line.split('\t')
        if len(parts) >= 4:
            rows.append({
                "pc_addr": parts[0],
                "name": parts[1],
                "confidence": parts[2],
                "reviewed": parts[3] == "yes",
                "evidence": parts[4] if len(parts) > 4 else ""
            })
    return rows

def parse_all_seeds():
    """Parse all seed files."""
    seeds_dir = PROJECT_ROOT / "db" / "seeds"
    all_seeds = {}
    
    for tsv_file in seeds_dir.rglob("*.tsv"):
        rel_path = tsv_file.relative_to(seeds_dir)
        all_seeds[str(rel_path)] = parse_seeds_tsv(tsv_file)
    
    return all_seeds

def parse_cmake_tests():
    """Parse CMakeLists.txt for test definitions."""
    cmake_path = PROJECT_ROOT / "CMakeLists.txt"
    content = cmake_path.read_text()
    
    tests = []
    # Find add_test calls
    test_pattern = r'add_test\(NAME\s+(\w+)\s+COMMAND\s+(.+?)\)'
    for match in re.finditer(test_pattern, content, re.DOTALL):
        name = match.group(1)
        command = match.group(2).strip()
        tests.append({"name": name, "command": command[:200]})
    
    # Find target libraries
    libs = re.findall(r'add_library\((\w+)\s+STATIC', content)
    executables = re.findall(r'add_executable\((\w+)', content)
    
    return {
        "tests": tests,
        "libraries": libs,
        "executables": executables
    }

def parse_functions_db():
    """Parse the functions SQLite database."""
    db_path = PROJECT_ROOT / "db" / "functions.sqlite"
    if not db_path.exists():
        return {"count": 0, "by_confidence": {}, "by_subsystem": {}}
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get table info
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    
    result = {"tables": tables}
    
    if 'functions' in tables:
        cursor.execute("SELECT COUNT(*) FROM functions")
        result["count"] = cursor.fetchone()[0]
        
        cursor.execute("SELECT confidence, COUNT(*) FROM functions GROUP BY confidence")
        result["by_confidence"] = dict(cursor.fetchall())
        
        cursor.execute("SELECT subsystem, COUNT(*) FROM functions WHERE subsystem IS NOT NULL GROUP BY subsystem")
        result["by_subsystem"] = dict(cursor.fetchall())
    
    conn.close()
    return result

def parse_probes_tsv():
    """Parse tests/behaviour/probes.tsv"""
    probes_path = PROJECT_ROOT / "tests" / "behaviour" / "probes.tsv"
    if not probes_path.exists():
        return []
    
    probes = []
    content = probes_path.read_text()
    lines = content.strip().split('\n')
    
    for line in lines:
        if line.startswith('#') or not line.strip():
            continue
        parts = line.split('\t')
        if len(parts) >= 4:
            probes.append({
                "id": parts[0],
                "address": parts[1],
                "type": parts[2],
                "description": parts[3]
            })
    return probes

def parse_golden_tests():
    """Parse golden test files."""
    golden_dir = PROJECT_ROOT / "tests" / "golden"
    golden = {}
    
    for txt_file in golden_dir.rglob("*.txt"):
        rel = txt_file.relative_to(golden_dir)
        content = txt_file.read_text()
        lines = [l for l in content.strip().split('\n') if l.strip() and not l.startswith('#')]
        golden[str(rel)] = {
            "count": len(lines),
            "sample": lines[:5]
        }
    return golden

def parse_behaviour_tests():
    """Parse behaviour test files."""
    behaviour_dir = PROJECT_ROOT / "tests" / "behaviour"
    tests = {"referee": [], "competition": [], "cdb": []}
    
    for subdir in ["referee", "competition", "cdb"]:
        subdir_path = behaviour_dir / subdir
        if subdir_path.exists():
            for f in subdir_path.glob("*"):
                if f.is_file() and not f.name.startswith('.'):
                    tests[subdir].append({
                        "name": f.name,
                        "size": f.stat().st_size,
                        "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat()
                    })
    return tests

def parse_milestones():
    """Extract milestones from the workflow guide."""
    guide_path = PROJECT_ROOT / "pes-workflow-guide-v3.md"
    content = guide_path.read_text()
    
    milestones = []
    # Find the milestones table
    table_match = re.search(r'## 15\. Milestones([\s\S]*?)(?:\n## |\Z)', content)
    if table_match:
        table_section = table_match.group(1)
        # Parse markdown table rows
        rows = re.findall(r'\|\s*(\d+)\s*\|\s*([A-C])\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|', table_section)
        for num, track, milestone, done_when in rows:
            milestones.append({
                "number": int(num),
                "track": track,
                "milestone": milestone.strip(),
                "done_when": done_when.strip()
            })
    return milestones

def parse_open_questions():
    """Extract open questions from the workflow guide."""
    guide_path = PROJECT_ROOT / "pes-workflow-guide-v3.md"
    content = guide_path.read_text()
    
    questions = []
    # Find the open questions section
    section_match = re.search(r'## 16\. Open questions([\s\S]*?)(?:\n## |\Z)', content)
    if section_match:
        section = section_match.group(1)
        # Match numbered questions, including strikethrough ones
        q_matches = re.findall(r'(\d+)\.\s+(.+?)(?=\n\d+\.|\n## |\Z)', section, re.DOTALL)
        for num, q in q_matches:
            questions.append({"number": int(num), "question": q.strip()})
    return questions

def parse_toolchain():
    """Parse TOOLCHAIN.md if it exists."""
    toolchain_path = PROJECT_ROOT / "TOOLCHAIN.md"
    if not toolchain_path.exists():
        return {}
    
    content = toolchain_path.read_text()
    return {"content": content[:3000]}

def main():
    print("Building dashboard data...")
    
    data = {
        "generated_at": datetime.now().isoformat(),
        "project_root": str(PROJECT_ROOT),
        "findings": parse_findings_md(),
        "seeds": parse_all_seeds(),
        "cmake": parse_cmake_tests(),
        "functions_db": parse_functions_db(),
        "probes": parse_probes_tsv(),
        "golden_tests": parse_golden_tests(),
        "behaviour_tests": parse_behaviour_tests(),
        "milestones": parse_milestones(),
        "open_questions": parse_open_questions(),
        "toolchain": parse_toolchain()
    }
    
    output_path = PROJECT_ROOT / "docs" / "data.json"
    output_path.write_text(json.dumps(data, indent=2))
    print(f"Data written to {output_path}")
    print(f"Findings entries: {len(data['findings'])}")
    print(f"Seed files: {len(data['seeds'])}")
    print(f"Tests: {len(data['cmake']['tests'])}")
    print(f"Functions in DB: {data['functions_db'].get('count', 0)}")
    print(f"Probes: {len(data['probes'])}")
    print(f"Milestones: {len(data['milestones'])}")

if __name__ == "__main__":
    main()