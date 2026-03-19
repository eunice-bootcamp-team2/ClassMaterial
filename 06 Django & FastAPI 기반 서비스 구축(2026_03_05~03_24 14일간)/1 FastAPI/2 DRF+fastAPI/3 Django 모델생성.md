ERD 기반으로 실제 Django 모델을 각 앱에 작성하고 → 마이그레이션으로 테이블을 생성

순서
1️⃣ accounts  
2️⃣ products  
3️⃣ reviews  
4️⃣ interactions  
5️⃣ ai_gateway (모델 없음)

---
1️⃣ accounts models

`backend/apps/accounts/models.py`
```python
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    사용자 모델
    """

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username
```
---

2️⃣ products  models

`backend/apps/products/models.py`
```python
from django.db import models


class Product(models.Model):
    """
    제품 모델
    """

    name = models.CharField(max_length=255)

    description = models.TextField(
        blank=True,
        null=True
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    image = models.ImageField(
        upload_to="products/",
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.name
```
---
3️⃣ reviews  models

`backend/apps/reviews/models.py`
```python
from django.db import models
from django.conf import settings

from apps.products.models import Product


User = settings.AUTH_USER_MODEL


class Review(models.Model):
    """
    제품 리뷰
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    content = models.TextField()

    rating = models.IntegerField()

    is_public = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.product} - {self.user}"


class ReviewImage(models.Model):

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="images"
    )

    image = models.ImageField(
        upload_to="reviews/"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )
    

class ReviewAI(models.Model):

    review = models.OneToOneField(
        Review,
        on_delete=models.CASCADE,
        related_name="ai_result"
    )

    sentiment = models.CharField(
        max_length=50
    )

    confidence = models.FloatField()

    keywords = models.JSONField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )
```
---
4️⃣ interactions  models

`backend/apps/interactions/models.py`
```python
from django.db import models
from django.conf import settings

from apps.reviews.models import Review


User = settings.AUTH_USER_MODEL


class ReviewLike(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="likes"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        unique_together = ("user", "review")
 
       
class ReviewBookmark(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="bookmarks"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )
    

class ReviewComment(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="comments"
    )

    content = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )
    

class ReviewReport(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="reports"
    )

    reason = models.CharField(
        max_length=255
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )
```
---
### 공통 테스트 : 마이그레이션 테스트

확인할 내용
- 각 앱의 테이블이 정상 생성되는지
- 외래키 관계가 정상 반영되는지
- `ReviewAI`의 OneToOne 관계가 DB에 반영되는지
- `ReviewLike`의 unique 제약이 반영되는지

확인명령어
```bash
python manage.py makemigrations  
python manage.py migrate  
python manage.py showmigrations
```

정상 출력 예시
```bash
accounts
 [X] 0001_initial

products
 [X] 0001_initial

reviews
 [X] 0001_initial

interactions
 [X] 0001_initial
```
- `[X]` → 적용 완료
- `[ ]` → 아직 적용 안됨 (문제 있음)

추가 확인
```bash
python manage.py dbshell
```
들어가면 이렇게 보입니다 (SQLite 기준)
```bash
sqlite>
```
테이블 목록 확인
```sql
.tables
```
출력 예시
```
accounts_user
products_product
reviews_review
reviews_reviewimage
reviews_reviewai
interactions_reviewlike
interactions_reviewbookmark
interactions_reviewcomment
interactions_reviewreport
```
우리가 생성한 테이블이 모두 보이면 성공

### 테이블 구조 확인
review 테이블 확인
```sql
.schema reviews_review
```

출력예시
```sql
CREATE TABLE "reviews_review" (
    "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" text NOT NULL,
    "rating" integer NOT NULL,
    "user_id" integer NOT NULL,
    "product_id" integer NOT NULL,
    FOREIGN KEY("user_id") REFERENCES "accounts_user"("id"),
    FOREIGN KEY("product_id") REFERENCES "products_product"("id")
);
```
여기서 보는 것
- `user_id`, `product_id` 있음 → FK 정상 👍

테스트후 빠져나오는 명령어
```bash
.exit
.quit
Ctrl + D
```

---
### 모델 생성 후 꼭 해야 하는 백엔드 테스트
1. User 생성 테스트
2. Product 생성 테스트
3. Review 생성 및 User/Product FK 연결 테스트
4. ReviewAI OneToOne 중복 방지 테스트
5. ReviewLike 중복 좋아요 방지 테스트
    
추가 확인:
- Review 삭제 시 연관 데이터 cascade 삭제 여부

Django shell
```bash
python manage.py shell
```

User 생성 테스트
```python
from django.contrib.auth import get_user_model
User = get_user_model()

user = User.objects.create_user(username="test", password="1234")
user
```

Product 생성 테스트
```python
from apps.products.models import Product

product = Product.objects.create(name="크림", price=10000)
product
```

Review 생성 + FK 연결 테스트
```python
from apps.reviews.models import Review

review = Review.objects.create(
    user=user,
    product=product,
    content="좋아요",
    rating=5
)

review.user
review.product
```

ReviewAI OneToOne 테스트
```python
from apps.reviews.models import ReviewAI

ai1 = ReviewAI.objects.create(review=review, sentiment="positive")

# ❌ 이건 실패해야 정상
ai2 = ReviewAI.objects.create(review=review, sentiment="negative")
```
에러 나면 성공 (중복 방지 OK)

ReviewLike 중복 테스트
```python
from apps.interactions.models import ReviewLike

like1 = ReviewLike.objects.create(user=user, review=review)

# ❌ 이건 실패해야 정상
like2 = ReviewLike.objects.create(user=user, review=review)
```

cascade 삭제 테스트
```python
review.delete()

# 같이 삭제됐는지 확인
ReviewLike.objects.all()
ReviewAI.objects.all()
```
