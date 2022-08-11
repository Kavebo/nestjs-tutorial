import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as pactum from 'pactum';

import { AppModule } from '../src/app.module';
import { AuthDto } from '../src/auth/dto';
import { CreateBookmarkDto, EditBookmarkDto } from '../src/bookmark/dto';
import { PrismaService } from '../src/prisma/prisma.service';
import { EditUserDto } from '../src/user/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      exports: [],
      providers: [],
    }).compile();

    // eslint-disable-next-line prefer-const
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();
    await app.listen(3333);
    prisma = app.get(PrismaService);
    await prisma.cleanDb();
    pactum.request.setBaseUrl('http://localhost:3333');
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'bobo@bobo.com',
      password: '123',
    };
    describe('SignUp', () => {
      it('should throw if email empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({ password: dto.password })
          .expectStatus(400);
      });
      it('should throw if password empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({ email: dto.email })
          .expectStatus(400);
      });
      it('should throw if no body', () => {
        return pactum.spec().post('/auth/signup').expectStatus(400);
      });
      it('should Sign up', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(201);
      });
    });
    describe('SignIn', () => {
      it('should Sign In', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody(dto)
          .expectStatus(200)
          .stores('userAt', 'access_token');
      });
      it('should throw if email empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({ password: dto.password })
          .expectStatus(400);
      });
      it('should throw if password empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({ email: dto.email })
          .expectStatus(400);
      });
      it('should throw if no body', () => {
        return pactum.spec().post('/auth/signin ').expectStatus(400);
      });
    });
  });
  describe('User', () => {
    describe('Get user', () => {
      it('should get current user', () => {
        return pactum
          .spec()
          .withHeaders({ Authorization: 'Bearer $S{userAt }' })
          .get('/users/me')
          .expectStatus(200);
      });
    });
    describe('Edit  user', () => {
      it('should edit user', () => {
        const dto: EditUserDto = {
          firstName: 'User',
          lastName: 'Last',
        };

        return pactum
          .spec()
          .withHeaders({ Authorization: 'Bearer $S{userAt }' })
          .withBody(dto)
          .patch('/users')
          .expectStatus(200)
          .expectBodyContains('firstName')
          .expectBodyContains('lastName');
      });
    });
  });
  describe('Bookmarks', () => {
    describe('Get empty Bookmarks', () => {
      it('empty bookmark', () => {
        return pactum
          .spec()
          .withHeaders({ Authorization: 'Bearer $S{userAt }' })
          .get('/bookmarks')
          .expectStatus(200)
          .expectBody([]);
      });
    });
    describe('Create Bookmark', () => {
      it('create new bookmark', () => {
        const dto: CreateBookmarkDto = {
          title: 'New Bookmark',
          link: 'link 1',
        };
        return pactum
          .spec()
          .withHeaders({ Authorization: 'Bearer $S{userAt }' })
          .withBody(dto)
          .post('/bookmarks')
          .expectStatus(201)
          .expectBodyContains('title')
          .stores('bookmarkId', 'id');
      });
    });
    describe('Get Bookmarks', () => {
      it('Have bookmarks', () => {
        return pactum
          .spec()
          .withHeaders({ Authorization: 'Bearer $S{userAt }' })
          .get('/bookmarks')
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });
    describe('Get Bookmark by id', () => {
      it('should get bookmark', () => {
        return pactum
          .spec()
          .withHeaders({ Authorization: 'Bearer $S{userAt }' })
          .get('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}');
      });
    });
    describe('Edit Bookmark by id', () => {
      it('should edit bookmark', () => {
        const dto: EditBookmarkDto = {
          description: 'New Description',
        };
        return pactum
          .spec()
          .withBody(dto)
          .withHeaders({ Authorization: 'Bearer $S{userAt }' })
          .patch('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .expectStatus(200)
          .expectBodyContains('New Description');
      });
    });
    describe('Delete Bookmark by id', () => {
      it('should delete bookmark', () => {
        return pactum
          .spec()
          .withHeaders({ Authorization: 'Bearer $S{userAt }' })
          .delete('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .expectStatus(204);
      });
      it('Have no bookmarks', () => {
        return pactum
          .spec()
          .withHeaders({ Authorization: 'Bearer $S{userAt }' })
          .get('/bookmarks')
          .expectStatus(200)
          .expectJsonLength(0);
      });
    });
  });
});
