# **Project Wrap Export Specification**

## **1\. Purpose**

This document defines the **Project Wrap** technical requirements. A Project Wrap is a single, structured export package containing all **Approved** artifacts for downstream editorial use. The objective is to enable a **one‑click import** into professional NLEs—specifically **DaVinci Resolve** and **Adobe Premiere Pro**—with correct clip names, metadata, folder structure, and timeline assembly.

The specification is intentionally deterministic: given the same approved artifacts, the system must always produce the same directory layout, filenames, and XML/EDL contents.

---

## **2\. Scope**

Included in Project Wrap:

* Approved video clips (.mp4)  
* NLE‑compatible project/timeline descriptors (XML \+ EDL)  
* Machine‑readable manifest and checksums  
* Human‑readable summary metadata

Explicitly excluded:

* Draft or rejected artifacts  
* Raw camera originals (unless explicitly marked Approved)  
* Color‑grade, VFX, or audio mix exports beyond reference tracks

---

## **3\. Export Package Layout**

\<ProjectName\>\_ProjectWrap\_\<YYYYMMDD\>\_\<Version\>/  
│  
├─ clips/  
│  ├─ scene\_\#\#\#/  
│  │  ├─ \<CLIP\_FILENAME\>.mp4  
│  │  └─ ...  
│  └─ ...  
│  
├─ timelines/  
│  ├─ project\_resolve.xml  
│  ├─ project\_premiere.xml  
│  └─ project\_master.edl  
│  
├─ metadata/  
│  ├─ project-manifest.xml  
│  ├─ project-manifest.json  
│  └─ checksums.sha256  
│  
└─ README.txt

---

## **4\. Clip Approval Rules**

Only artifacts meeting **all** of the following are eligible:

* Status \= `Approved`  
* Has immutable Scene ID and Shot ID  
* Has locked in/out timecodes  
* Has a resolved media file path at export time

If any approved artifact fails validation, **the entire Project Wrap export fails**.

---

## **5\. File Naming Convention (Mandatory)**

### **5.1 Base Format**

\<PROJECT\>\_SC\<SceneID\>\_SH\<ShotID\>\_TK\<TakeID\>\_\<ROLE\>\_\<VERSION\>.mp4

### **5.2 Field Definitions**

| Field | Description | Example |
| ----- | ----- | ----- |
| PROJECT | Short project code | `ALPHA` |
| SceneID | Zero‑padded integer | `003` |
| ShotID | Zero‑padded integer | `014` |
| TakeID | Zero‑padded integer | `02` |
| ROLE | `PRIMARY`, `ALT`, `BROLL` | `PRIMARY` |
| VERSION | Semantic or integer | `v1` |

### **5.3 Example**

ALPHA\_SC003\_SH014\_TK02\_PRIMARY\_v1.mp4

This filename is treated as the **single source of truth** by all NLE imports.

---

## **6\. Scene‑Based Directory Rules**

* All clips must reside under `clips/scene_<SceneID>/`  
* Scene folder name must match SceneID used in filenames  
* No clip may exist outside a scene folder

Example:

clips/scene\_003/ALPHA\_SC003\_SH014\_TK02\_PRIMARY\_v1.mp4

---

## **7\. Timeline Strategy**

A single **Master Timeline** is exported containing:

* One video track per ROLE (V1 \= PRIMARY, V2 \= ALT, V3 \= BROLL)  
* One reference audio track per clip (if present)  
* Timeline order determined by SceneID → ShotID → TakeID

---

## **8\. DaVinci Resolve XML Specification**

### **8.1 Format**

* FCPXML v1.9 compatible  
* UTF‑8 encoding

### **8.2 Key Requirements**

* `<clipitem>` names must exactly match exported filenames  
* `pathurl` must be **relative paths** to `clips/`  
* `start` / `end` must match approved in/out frames  
* `logginginfo` populated with SceneID and ShotID

### **8.3 Required Metadata Fields**

\<logginginfo\>  
  \<scene\>003\</scene\>  
  \<shot\>014\</shot\>  
  \<take\>02\</take\>  
\</logginginfo\>

Resolve must open the XML and immediately show:

* Binned clips grouped by Scene  
* A ready‑to‑play Master Timeline

---

## **9\. Premiere Pro XML Specification**

### **9.1 Format**

* Adobe Premiere Pro XML (FCP 7 dialect)

### **9.2 Key Requirements**

* `<clip>` names must match filenames exactly  
* `<file><pathurl>` must be relative  
* SceneID mapped to Premiere `Scene` metadata field  
* ShotID mapped to `Shot/Take`

### **9.3 Bin Structure**

Project Root  
└─ Scenes  
   └─ Scene 003  
      └─ ALPHA\_SC003\_SH014\_TK02\_PRIMARY\_v1.mp4

Importing the XML must produce:

* Pre‑organized bins  
* A populated sequence named `MASTER_TIMELINE`

---

## **10\. EDL Specification**

### **10.1 Purpose**

The EDL serves as a **fallback interoperability format**.

### **10.2 Format**

* CMX 3600  
* Frame‑accurate, drop‑frame preserved

### **10.3 Naming Rules**

* `TITLE:` must equal `<ProjectName>_MASTER`  
* `EVENT` comments must include SceneID and ShotID

Example:

\* SCENE: 003 SHOT: 014 TAKE: 02

---

## **11\. Project Manifest**

### **11.1 XML Manifest (project-manifest.xml)**

Defines authoritative export state.

Required fields:

* Project name and version  
* Export timestamp  
* List of approved artifacts  
* Scene/Shot/Take mapping  
* Timeline order

### **11.2 JSON Manifest**

JSON mirror of the XML manifest for programmatic ingestion.

---

## **12\. Checksums**

* SHA‑256 checksum per exported file  
* Stored in `metadata/checksums.sha256`  
* Used for downstream integrity verification

---

## **13\. Validation Rules (Hard Failures)**

Export must fail if:

* Any approved clip is missing  
* Filename does not match convention  
* XML references non‑existent media  
* SceneID mismatch between filename, folder, and metadata

---

## **14\. README.txt (Human‑Readable)**

Must include:

* Project name  
* Export version and date  
* Import instructions for Resolve and Premiere  
* Known limitations

---

## **15\. Non‑Goals**

* No automatic relinking to external media  
* No editorial decision‑making at export time  
* No platform‑specific color or audio transforms

---

## **16\. Summary**

The Project Wrap is a **deterministic, editor‑ready delivery artifact**. If this specification is followed, any professional editor can unzip the package and be cutting within minutes—without manual relinking, renaming, or re‑organization.

