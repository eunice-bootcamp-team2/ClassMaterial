깃허브 홈주소
![[Pasted image 20260108174355.png]]

레파지토리로 이동 클릭
![[Pasted image 20260108174437.png]]

새로 보관함 만들기 녹색버튼 클릭
![[Pasted image 20260108174505.png]]

보관함 설정
![[Pasted image 20260108174641.png]]
설정이 끝나면 생성 보관함 녹색버튼 클릭하여 생성

![[Pasted image 20260108174745.png]]

순서대로 터미널에 입력하기
```bash
git init    # 깃허브 연동 초기화
.gitignre 파일을 작성한다.
git add . # 리드미파일을 깃허브에 연동한다.
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/eunice-bootcamp-team2/app.git
git push -u origin main
```

init 초기화를 누르면 vscode가 아래 화면처럼 변한다
![[Pasted image 20260108175035.png]]

`git add . ` 이 명령어의 의미 : +를 눌러서 Staged Changes 이동시키기를 한것이다.
![[Pasted image 20260108175233.png]]


`.gitignore` 파일을 작성해야 한다. venv 가상환경은 깃허브 업로드에서 제외시켜야 한다.
```gitignore
.venv/
```

`git commit -m "first commit"` 이 명령어와 아래 이미지는 같은 의미다.
![[Pasted image 20260108175722.png]]

`git branch -M main` : marster를 main으로 브런치 변경: 깃허브에 올리는 애칭(이름)

`git remote add origin https://github.com/eunice-bootcamp-team2/app.git`
깃허브와 vscode를 연결시키는 명령어다.

`git push -u origin main`
깃허브에 최종 내 자료를 업로드 한다.
![[Pasted image 20260108180213.png]]


깃허브에서 새로고침을 누르면 자료가 업로드 된것을 확인할 수 있다.
![[Pasted image 20260108180307.png]]