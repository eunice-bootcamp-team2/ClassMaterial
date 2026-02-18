프로젝트 준비
```bash
mkdir time_series
cd time_series

uv venv
source .venv/bin/activate

which python # 활성화 확인
uv pip install notebook # 쥬피터 설치
```

쥬피터 실행: wsl2 (브라우저 자동 실행 X)
```bash
jupyter notebook --no-browser --port=8888
```

쥬피터 실행: mac macOS (브라우저 자동 실행 O)
```bash
jupyter notebook
```

이 명령은 브라우저를 자동으로 열지 않고 포트만 열어줍니다.
WSL의 IP 주소를 사용하여 브라우저에서 접속해야 합니다.
```bash
# wsl용
jupyter notebook --no-browser --port=8888

# macOS 
jupyter notebook 또는 
jupyter notebook --no-browser --port=9999
```
이 명령은 브라우저를 자동으로 열지 않고 포트만 열어줍니다.
- WSL2에서 Windows 브라우저로 접속할 때는 보통 `localhost`로 접속하면 됩니다.
- 원격 서버(다른 PC에서 접속) 하는 경우에는 서버의 IP/도메인으로 접속합니다.

쥬피터 노트북과 연결된 링크 (실행 로그에 출력됨):
```
http://localhost:8888/tree?token=65342e7337763d3b6ebbfe5b2351a513560534e33725bec6
http://127.0.0.1:8888/tree?token=65342e7337763d3b6ebbfe5b2351a513560534e33725bec6
```

Jupyter Notebook이 실행 중일 때 "어디서, 어떤 주소로 실행되고 있는지"를 확인하는 명령어
```bash
jupyter server list
```

Jupyter가 어느 폴더에서 열렸는지 확인 가능
결과확인:
```
Currently running servers:
http://localhost:8888/?token=4a21a0d3abbfc92f22487f3942865a3ba19f4885a625a117 :: /home/youjung/kakaoMap
```

토큰만 복사 Password or token 여기에 붙여넣기
```
http://localhost:8888/?token=abc1234567890abcdef...
```

---
EXTENSIONS 에서 jupyter notebook을 설치한다.
![[커리큐럼/05 AI를 활용한 웹 개발(2026_02_19~03_04 9일간)/images/Pasted image 20250705222235.png]]
![[커리큐럼/05 AI를 활용한 웹 개발(2026_02_19~03_04 9일간)/images/Pasted image 20250705222241.png]]
![[커리큐럼/05 AI를 활용한 웹 개발(2026_02_19~03_04 9일간)/images/Pasted image 20250705222247.png]]
![[커리큐럼/05 AI를 활용한 웹 개발(2026_02_19~03_04 9일간)/images/Pasted image 20250705222252.png]]

| 확장명                            | 필요 여부    | 설명                                 |
| ------------------------------ | -------- | ---------------------------------- |
| **Jupyter**                    | ✅ **필수** | Jupyter 노트북(.ipynb) 실행 및 편집의 핵심 기능 |
| **Jupyter Keymap**             | ✅ 추천     | 단축키를 Jupyter Lab 스타일로 맞춰줌          |
| **Jupyter Cell Tags**          | ⭕ 선택     | Cell에 태그를 달아 구조화할 때 사용 (예: 슬라이드쇼용) |
| **Jupyter Notebook Renderers** | ⭕ 추천     | Plotly, Vega 등 시각화 라이브러리 잘 보이게 해줌  |
| **Jupyter Slide Show**         | ⭕ 선택     | 발표용 슬라이드 쇼 기능 (rare하게 사용)          |

---
새 파일 생성:
![[커리큐럼/05 AI를 활용한 웹 개발(2026_02_19~03_04 9일간)/images/Pasted image 20250629083329.png]]

단축키
![[커리큐럼/05 AI를 활용한 웹 개발(2026_02_19~03_04 9일간)/images/Pasted image 20250629083624.png]]

## ✅ Jupyter Notebook 단축키

셀 추가 / 삭제
```
A        :위에셀추가
B        :아래에셀추가
D,D     :셀삭제(D를빠르게두번)
Z        :방금삭제한셀되살리기
```

셀 타입 변경
```
Y: 코드 셀로 전환
M: 마크다운 셀로 전환
```

복사 / 이동
```
C        :셀복사
V        :복사한셀아래에붙이기
Shift+V:복사한셀위에붙이기
X        :셀잘라내기
```

셀 실행 관련
```
Shift+Enter :셀실행+다음셀로이동
Ctrl+Enter :셀실행만(이동X)
Alt+Enter :셀실행+아래에새셀생성
```

🧠 최종 정리 (정확 버전)
```
A        : 위에 셀 추가
B        : 아래에 셀 추가
D, D     : 셀 삭제
Z        : 삭제한 셀 되살리기

Y        : 코드 셀로 전환
M        : 마크다운 셀로 전환

C        : 셀 복사
V        : 복사한 셀 아래에 붙이기
Shift+V  : 복사한 셀 위에 붙이기
X        : 셀 잘라내기

Shift + Enter : 셀 실행 + 다음 셀 이동
Ctrl  + Enter : 셀 실행만
Alt   + Enter : 셀 실행 + 새 셀 생성
```

---

🛑 Jupyter 종료 명령어 검증
```bash
jupyter notebook stop
```

강제 종료, WSL / Linux
```bash
pkill -f ipykernel_launcher
```

> 참고: macOS에서도 동작하지만 가급적 stop 명령 먼저 권장
