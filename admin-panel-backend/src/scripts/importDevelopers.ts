import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Developer } from '../entities/Developer';

const developersData: Record<string, string> = {
  "Mr. Eight": "2d0d3a61-3290-40c8-87cc-5dc07e7e90bb",
  "Cirrera Development": "834ff38d-b7bf-4b10-87a2-060f94ff6767",
  "ENSO": "c3a43372-6f9e-4aa4-9878-30df3ce6b013",
  "MVS Real Estate Development": "c2bcd356-8592-4cb2-ac8c-b67da52ec29a",
  "Segrex Development": "3b70689b-b74e-4ea1-8f70-89e4c106f492",
  "Major Developments": "8f3b6c16-7ab2-4351-9516-9ceed860b98b",
  "Green Horizon Development": "9e695819-33d9-481e-87e8-7b1216dc513c",
  "Palladium Development": "4bd08a66-abb9-4f28-8cc0-bb444c7f76c2",
  "Topero Properties": "ff2450d6-b015-47f7-9a20-5fee53d64baf",
  "Vision developments": "4cc30cd4-e4e9-470b-860d-2eaad67bb53e",
  "Emaar Properties": "3b7d2c70-4658-4d1d-b969-e1c5ebfd0851",
  "Damac": "39671c40-5a78-442f-aede-a058ee0b4cc5",
  "AMIS Properties": "47c81f9a-ea8d-4e90-b161-fed5002f3692",
  "Tabeer": "b49b9873-f327-4a81-9cbf-b54e4b5615a9",
  "Wellington Developments": "c206cbe6-8704-4a01-a541-15f7edaa30ae",
  "True Future Real Estate Development": "f95096a4-6f83-4397-b173-27eec2830851",
  "Rabdan Real Estate Developments": "3836449c-72ff-473e-a0e0-88e5ae2f3fac",
  "Abou Eid Real Estate Development": "fa188280-659c-425a-a4e8-8b4d6ea568e4",
  "Majid Al Futtaim": "e7560664-0dcd-49eb-9c69-96a8719a2550",
  "Ellington": "225eabc6-3f50-4322-9807-7dbc9d5e8ad1",
  "Imtiaz": "58fe1784-53b9-43e0-9fad-f82335da5b6f",
  "Forum Real Estate Development": "7a93bee6-7391-464d-b44f-916ffad6622a",
  "Empire Developments": "d5f7866b-9170-48d4-b960-aa56ae1a406a",
  "Binghatti": "3cba7206-8305-4821-938a-763b054bcaf5",
  "BT Properties": "2d0c3f86-7925-4ecb-90cd-b9a87b8b0fea",
  "Rvl Real Estate": "11ec3fc2-3492-4fa3-b5bb-7859a4d2fa07",
  "HRE Development": "84476f48-9cf9-42bc-be25-f900cdd7dee5",
  "Tarrad Development": "ca0e4fc2-89c7-4377-86bc-34fa019d0f61",
  "Vincitore": "d4d14f68-0ce7-4b09-b6d4-32ec154562e7",
  "Dugasta Properties Development": "ec08fa7b-d1c4-4dcf-ab2b-d2db4db5193f",
  "Casagrand": "a978f4b5-9b25-4985-99fc-d1f3af7f4258",
  "Amirah Developments": "aa28a7b9-e1ec-470b-9133-ee2bd03aacf2",
  "SOL Properties": "8ffc609c-5433-4494-a6dc-6ac688318546",
  "London Gate": "0979c804-b6e3-41e3-85ae-6846e77faf69",
  "Leos Development": "9ffd52de-902e-409d-b2da-4e806abb0a57",
  "Arete Developments": "891e1fc4-17cb-4e7e-b992-d2beaf927f58",
  "Object One": "7fa51e52-1d80-4cb6-b3eb-da9486b74eba",
  "7th Key": "3434540a-9884-4068-a179-b8baf2ad24c6",
  "New MFOUR Real Estate Development": "08ef76dc-0af4-40dd-853a-f3c63bff4120",
  "Casa Vista Development": "bccc947a-401a-46fb-b05f-1db0d9fc40bc",
  "LMD": "db6dff48-2ef9-416d-9347-e2f46589b3a3",
  "Tasmeer Indigo Properties": "8917ba51-3bc1-4023-986c-ac4001ff56f9",
  "Black Soil": "ab2bddb7-da6e-461f-825c-08833a3dc7d5",
  "Lamar Development": "dbe80e3b-5bc4-4b79-b4af-6129819e91c0",
  "AHS Properties": "1d0da11d-1eee-4cb1-9902-cf361741f75b",
  "Deyaar": "0cc6c7c0-c554-423a-a637-8bb3342a8286",
  "Confident Group": "72e676c1-c3bc-4ce0-8793-a8e31c14f18d",
  "QUBE Development": "15b618ff-644d-4d27-984e-b2e823b591e5",
  "AB Developers": "51a30934-327f-4cd9-adb5-1ba33a241dff",
  "AYS Property Development": "75496055-5fcb-442d-9c4b-18f057ed8e5d",
  "Laraix": "33a6f2ce-e08b-4aae-bf50-20315a08fdf9",
  "Calgary Properties": "27b3daf7-9faa-4238-955a-c0288fdf79cd",
  "DHG Real Estate Group": "abc6d788-e502-4bf2-a17a-3e005acf2ef5",
  "Nakheel": "27823b3f-6a80-4c07-a72c-27bb6c3966c7",
  "Stamn Development": "ffa36098-ba52-43ec-9bcf-82fe8b3fd316",
  "Fakhruddin Properties": "49118011-f96d-4d03-a12f-af75a466ee5e",
  "Pasha 1": "868730f8-ba19-432b-846e-8da6a536bada",
  "Credo Investments": "cc7dce26-de37-42e0-8b58-6f26df319c6c",
  "Sobha": "ddde452b-a18a-46a1-a297-31b4623b4094",
  "Golden Woods": "ed4cbb33-94b7-4a6d-80c3-db32d11be0c9",
  "Azizi": "096760e9-b0e6-4f22-9078-05b884f541ad",
  "Meraas": "5a5004be-ca68-4931-8e00-6e1e5e9b6525",
  "Symbolic Developments": "466d59b4-683f-4b4b-8595-144c830f9a81",
  "Tiger Properties": "7972d6b0-4904-441b-85d5-a027e79cae03",
  "Omniyat": "cb00ba93-5d63-4553-9902-426fcee0972e",
  "Peace Homes Development": "0334316d-d862-4111-a9e9-d0d3a9203032",
  "Samana": "c1180d27-1ed6-4f78-947f-554edc264f5b",
  "Beyond": "0225189f-0990-42e0-9c52-5ef837dddd46",
  "Anax Developments": "bed121c8-1927-41b1-81f1-d1935519c8cf",
  "Nshama": "b192f5e3-c239-43ee-b4bf-adc23694d744",
  "Wadan Developments": "c4ad1da0-ea40-4792-a93b-33bcebda3f9e",
  "Valores Property Development": "a72c3e88-a5ba-473f-b913-69384316c879",
  "BnW Developments": "312263b8-e0c7-4302-a022-f74db3e22663",
  "Iquna Properties": "133e44d6-3c78-4154-bae2-a5e13a72da3d",
  "Aldar": "fb0e4e26-8701-43e9-8f06-1a93bf8f1fb8",
  "Elysian Development": "039672ee-bacf-4da0-b13b-655d2e93703e",
  "Danube": "f52c52d6-1a6a-44c3-a2f5-a4765a56dd64",
  "AUM Development": "5e7edb77-3591-4ac5-9dd7-a10c07c6f612",
  "Barco Developers": "7f72f7e9-273a-4da5-a3be-c2126a9558ba",
  "Newbury Developments": "bdac0392-84cd-4ea0-9c2f-1344547319b0",
  "MAG Property Development": "060dc5c4-a9e7-44a8-a3ff-6e5573ea71e0",
  "Zimaya Properties": "53db6940-f002-4ab5-bbe6-06fc4653dd74",
  "HMB Homes": "cb6dffd3-e750-4451-9ce5-4589f37c6f4e",
  "Wasl": "177aeada-8895-40b3-adc7-8b09517631dd",
  "Meraki Developers": "eacf5194-e067-49d4-a3a5-ac72101bba04",
  "Skyline Builders": "70fe169b-e8e2-4d15-8691-32d0487a280e",
  "MAK Developers": "463deebc-2dcc-4a92-99be-1b381435f0b1",
  "Avenew Development": "3b03ad7b-4bf1-4169-9eb5-fd5c3db9c37d",
  "Atmosphere Living": "cb6cb83f-ad85-41dc-9aac-559f7cfd63fe",
  "HZ Development": "3eba36c2-4178-4d60-8ad8-d1674cc19f48",
  "Nuri Living": "8882bb5e-2afb-423e-a9a6-c025c413c835",
  "Shakirov Developments": "b42d1cba-1945-4621-85e0-704f40383dd3",
  "Marquis": "11b52253-b0fe-40a8-8384-b4f0fd43490e",
  "Reef Luxury Developments": "ed1b4e12-30ae-4b80-8a99-32c348c1f3bf",
  "Grid Properties": "d3f44652-50ac-4a49-80aa-d6beeb29122d",
  "Taraf": "828dc346-003b-4f0f-ba72-9c50c9bbb6fd",
  "Elton Real Estate Development": "153a3e90-e3db-4802-a957-735a614394ad",
  "TownX": "a0b24c56-204f-4a53-ae21-ef2ad03a1c48",
  "Maakdream Properties": "8315af5e-2d12-4537-9e25-a7fcc29d3619",
  "Infracorp": "aa104ecb-d184-47d9-963b-ce350b3c4111",
  "Grovy Real Estate Development": "e7f04d67-250b-469f-bf01-bb21ff8fb0e7",
  "Unique Saray": "c28cecca-8eb2-4fba-9583-a97222e33f8f",
  "ARIB Developments": "49f3edd3-7d38-49e8-8f5f-205678a80a69",
  "AMBER Developments": "475b0d4e-227e-44b1-9d91-eb631721acaf",
  "Dubai South": "5689c9d7-d0df-4971-9e6c-82d5d3bf74d1",
  "The Heart of Europe": "20ff0114-813f-481c-8e28-e31084f70ac1",
  "City View Development": "a0d214ed-4802-417c-9262-fc5df416927b",
  "SCC Vertex Development": "18e5093e-5033-4abc-9b1b-91c4814fa397",
  "Al Tareq Star Real Estate Development": "7ad7ba25-eca0-4a76-bd35-ff5bff16b623",
  "Tomorrow World Properties": "bec04587-7596-449c-8623-01bf6b4ed0a4",
  "FIM Partners": "1af52f70-34bc-4b1f-a9d6-a0e9463b6d5f",
  "Prestige One": "c7acdc4d-f0ab-4a8f-a07d-3a023b6b966e",
  "Iman Developers": "a3357369-5d9e-4dfd-b29d-0ff84fd9b71a",
  "DECA Development": "721a3eeb-3897-41f7-b73d-ffa70d5b7a40",
  "One Development": "d55fd39a-2d0e-4c24-b052-0bc9c7886d20",
  "ARADA": "d07d94ca-e6c1-4f67-a7d4-42ed45440350",
  "Manam RED": "af7c2c8b-a4b5-4838-8b04-86eb1afa9911",
  "Dubai Properties": "a6dba6c4-4495-4ab8-b588-4d1a79db3b59",
  "AMWAJ Development": "e8a93a09-7219-416e-bf97-cb5cc1887ccd",
  "Centurion Development": "96874cc1-553c-4b43-aa2e-f34f76e7b76f",
  "Lapis Properties": "ce34a7a2-593d-472c-ba18-452051bfd1d2",
  "Mulk Properties": "4e0f7118-6d04-4ffd-bcc7-b925af1aa6d4",
  "Peak Summit Real Estate Development": "40f6a19d-6357-4ea3-afe3-82236f2f9160",
  "Avelon Developments": "ffd56275-77e3-4d0a-8113-bedaab1749c6",
  "Bling Development": "25c0cfd4-8622-4618-be15-5e7dfe416144",
  "OCTA Development": "a53bb86f-6eef-40bb-bd28-b05883e75e9d",
  "West F5 Development": "92fb134c-9ec9-4559-9b31-20735cf24b5b",
  "Me Do Re": "d48423d7-14ce-48f1-903a-07fc7f501cd7",
  "Citi Developers": "f15e3061-8dc7-4092-a279-f904f38e1251",
  "Nabni": "745a2f89-c490-4bb8-aae7-167a3da9f4cd",
  "Majid Developments": "eed3cb8c-11f3-446b-94e7-047c13fba94c",
  "IKR Development": "d676e21b-3f3e-4ed5-ab8b-12bf96eb3ae1",
  "Urban Venture": "b1d130c1-2d19-4def-8cc1-d8821f34522f",
  "AYAT Development": "a64d9f04-d65d-48b2-9967-1fc722ba6253",
  "Pantheon": "357327cf-be51-4004-93e9-2663ed5f9fe3",
  "Mashriq Elite Real Estate Development": "c13a8abe-57df-456c-b0ed-ab246e0efa64",
  "Hayaat Developments": "ec37161c-10b5-4a7f-93f4-a69d71f5a1c6",
  "Arady Properties": "0041926b-1b13-46b3-8bd8-af785f0b4e81",
  "Madar Developments": "2d0ba099-33df-4456-bf25-779962d5bc39",
  "DarGlobal": "74dc3f9b-89f1-495f-82c8-752479e82fe8",
  "MAAIA Developers": "e26839d4-67d1-425c-b7c3-2cc23180a55c",
  "Ahmadyar Real Estate Development": "0e0b323b-fc8c-4381-ad3d-ddff1a6d4277",
  "Swank Development": "1c302aa3-6780-43ed-b39d-f42fa8cd39ef",
  "Expo City": "8a9237a1-3313-4cab-bfd3-bd966cfd1d38",
  "Gulf House Real Estate Development": "580e1012-93f2-4583-ad95-6f30fa3b9332",
  "Ginco Properties": "8e9a1ea2-7da6-4c0d-8e0f-634ba3b8105d",
  "Alaia Developments": "b6f4bc21-9601-49d3-b70e-e4e3c075acf6",
  "S&S Developments": "9d8d1815-d638-4d87-85d1-40cc87f60d99",
  "Mira Developments": "f529adf0-cdf7-4714-9565-eedd622fe5c5",
  "Zenith Ventures Real Estate Development": "87afeab6-068e-4363-86a4-57ff1a95e608",
  "Ever Glory Developments": "bb8eed55-1923-4ae4-b843-0e825a9682ff",
  "Roz Real Estate Development": "3211ecd1-f0f7-4504-89ff-40c0ccb5caf4",
  "Palma Development": "b1c1e9f0-e8d9-42ff-a23c-afa50a64254d",
  "Regent Developments": "665e5753-b83f-4daf-a8f1-a935b1ee938f",
  "ADE Properties": "cfb120bc-626a-45aa-b98c-d53c0066f944",
  "Rijas Developers": "26956958-8698-46b6-b675-a667e43356b6",
  "Oksa Developer": "f7c37df2-478f-46ca-b985-085ecc51e62f",
  "Reportage": "80888293-d556-45a2-8bc8-6b27546c397d",
  "Al Seeb Real Estate Development": "bec24a3e-b2ba-4dde-8110-0eac634225bf",
  "Mill Hill": "f5b856c8-233c-4943-9f4c-b06323728842",
  "Condor": "8c05e948-e3c4-41ec-b9c4-247e87846c6b",
  "Prescott Development": "d76a98e0-7c6b-467c-a657-2d1c4ba55dcd",
  "Vantage Ventures": "b953fe13-8fcd-4c6f-a5a1-c897529c7853",
  "Heilbronn Properties Ltd.": "43a252ca-a5cb-4a29-adc6-c1d7901e0aee",
  "Nexus": "f5b0592c-762e-41ef-b34f-23c90295d9d4",
  "Green Group": "a4541e92-e219-4a22-89e6-104ef02f9c9f",
  "SABA Properties": "e668fea2-7d35-459d-91aa-1692c1b2d164",
  "Al Ali Property Investment": "2cbfca24-e917-4f69-a2bd-0d449167a3ff",
  "Acube Developers": "042ae0a2-5de2-47d9-b1b1-0f2c615df675",
  "Irth Development": "185fb0e6-a324-44f8-ac56-5d09dcfd595c",
  "Pearlshire": "85e16f50-94a0-481d-954c-af66269eb3df",
  "Ag Properties": "3dda669f-ed42-43b7-b0e4-58a535694d74",
  "LIV": "5708803d-ed29-4e49-8eff-5d41c1dac02c",
  "Glorious Future": "b22b2ef1-130f-4375-b8ec-acb75789a7d3",
  "Pinnacle A K S Real Estate Development": "7fed7b2f-b0db-46b9-81db-bc1626463413",
  "Aqua": "eb91eec7-9a17-48d5-a4b2-99d0f36a5e27",
  "EMS Development": "3caf0851-f607-4734-9038-70d0ac831758",
  "Kasco Real Estate Development": "6d87e0dc-1640-47f2-9417-1b84ae47311c",
  "Vantage Developments": "1f597e34-cb83-4945-9190-dd08f8e09692",
  "H&H Development": "d440ecd9-43ff-44e4-a344-9ef402082a88",
  "DV8 Developers": "7807ce11-9e4f-4324-a5d7-8797f9ca2611",
  "Arabian Gulf Properties": "27f9d0a5-ce17-4233-80d0-65c6075a77c4",
  "Siroya": "2acb5e91-bd7f-44d5-b341-5ce95e16bff7",
  "SAAS": "313cf729-8e6d-4e0f-926a-26d7f7b517ca",
  "Arsenal East": "6180e404-c3fc-47f0-b8be-1c6ecf7a9071",
  "Al Mawared Properties": "40d01551-efe5-42e7-8ac5-c71eac1f00ac",
  "Fortune 5": "81346634-8d65-428d-8de8-c58484153bc2",
  "SIDO Developer": "f0172c48-7d7c-40ff-b814-cd7d58015bae",
  "NED Properties": "9b391759-c8d6-4dc2-b381-abb865490f55",
  "MS Homes": "b32ff50b-8386-4f0e-8442-004bd38e0187",
  "PG Properties": "9d3385a5-527c-49d5-a8bf-002023e26914",
  "Time Properties": "efad6ec0-38ae-4fcc-a660-6c16d3a36842",
  "Manchester Real Estate": "634456ed-9932-4366-b361-71d99edf2f9f",
  "Riviera Group": "0118cd54-2c29-474d-841d-39084776548e",
  "Seven Tides": "db473267-33d4-4cd3-ba5a-2d0774f638d2",
  "Urban Properties": "cf72dc62-1278-4571-8e82-fef24bd272ae",
  "Union Properties": "b1fac286-33ca-47d4-8383-e2e999e0e6da",
  "Tranquil Infra Developers": "40760df0-74c8-4757-a4e4-a3ae12a0f735",
  "Amaal Development": "af5b3f30-89d1-4c5d-a381-cdaca881ed4f",
  "Karma Development": "c774d61c-1d4d-46de-841b-81a6107daac9",
  "Januss Developers": "5bd02e3b-782e-4e26-8a07-ab92fc3336c7",
  "Vakson First Property Development": "a5d758c0-68e2-47b5-a5cd-4b11d2ce67f2",
  "Al Sayyah Group": "747eb3c4-6dd7-4b5f-9d67-1effc8eaa141",
  "Crystal Bay Development": "0e11d369-e620-4b77-a0e8-f88c03802840",
  "Svarn Development": "30632594-50e4-4a84-93b6-e484858ca209",
  "Galaxy Realty": "ab746b1f-f6a7-4ea1-a392-a581fbbf69ec",
  "Yas Developers": "c76bf131-b935-4fff-a32c-ec3ff62f14d1",
  "ABA Real Estate Development": "f70df481-b831-44a3-98f7-b826720bba28",
  "Gulf Land Property Developers": "d0b99faa-e8b4-48e3-aa0f-d59d0f29143b",
  "Iraz Developments": "75af8722-7280-45b8-b7bd-6e1754cdc94b",
  "Sama Ezdan": "8dde6d15-f85b-4031-a14c-271e12e2b6c9",
  "Select Group": "436df9b6-308e-492a-bc67-0c55e4ac874d",
  "Casa Vista & Golden Woods Developers": "12c33103-c496-4379-a8e6-b3bf10a3aa35",
  "AMBS Real Estate Development": "c8f9e4dc-d72b-4588-a994-621786a8ed85",
  "Muraba Properties": "ccec79d9-1424-4487-9ba9-a58802c88e48",
  "Meteora": "377c0417-52b0-4bea-8612-fb10e9f27b0b",
  "The 100": "8e51f953-b2b9-447f-b9ab-580e296b110d",
  "Lucky Aeon": "6c6d2ca1-2e9f-4857-9d1c-8f0f2208609b",
  "Arista Properties": "b3e1b876-6241-44e3-9873-be6ea6e2b333",
  "Sankari Property": "a6df6ac0-c41b-484d-9046-9e4e5a55bbd0",
  "Rashed Aljabri": "7bc1e826-02b9-45bb-a466-f5dbd26aaebf",
  "East & West Properties": "91a23b1b-2ee4-4bb9-b28b-d24e78da449e",
  "Al Habtoor Group": "bde5a8f2-84da-4b9f-8f7c-7057ddd08a2d",
  "MERED": "803b633b-c4ea-48bd-b97f-4a5311c450d2",
  "Mada'in": "11dbe63e-2e4b-42c4-a973-c78f80bac1f7",
  "ONE YARD": "7b51a7e4-4dc4-424b-8d73-a1b444122a2e",
  "Metac Development": "7ef07bfa-816d-4f68-aff1-e448c886960a",
  "Dar Al Karama": "e798bcea-d3dc-4099-8028-9f366de5703a",
  "Kappa Acca Real Estate Development": "f0d941f5-e175-41f3-953c-254f6612dc56",
  "Laya Developers": "122c8bdc-1431-49d2-8262-df414dc54ab8",
  "B N H Real Estate Developer": "a486d97d-ed02-4f0e-a31b-545c0ff6cce5",
  "Orange.Life!": "9d496fff-0235-47e7-bbc7-083af060f2b5",
  "Premier Choice": "4945de7d-fa15-4cc6-929d-79412c234fe9",
  "Khamas Group": "c4ea379c-c676-4b75-ba9b-fb7590c77bfb",
  "DMCC": "1d85f8c0-5691-48d6-973a-aff4ccaea05c",
  "Aras Development": "25f6f063-b89b-4a84-906c-c37512f69861",
  "Naseeb Group": "c8133ce2-85d8-4265-8622-e31ed1db0339",
  "IGO": "b8d95735-8155-41dd-a4d3-fd376cfb6e96",
  "Swiss Property": "6735e9a6-61c8-46f1-9dd3-d70d26eed688",
  "Albait Al Duwaliy Real Estate Development": "47d39177-422c-4e52-b9a2-7d98b015ad9e",
  "GJ Properties": "b9e7316d-0149-474f-96fa-ee6571b49729",
  "National Properties": "ddffca4c-ae42-4613-a172-156a775db8dc",
  "SRG": "160e5ada-5a0d-4ecf-9e8f-df303ff125de",
  "Zumurud Real Estate - Sole Proprietorship": "fca8815e-d925-4600-aa52-9dad10274f2d",
  "A S I Real Estate Development": "b99adca4-a1d6-486e-b0b4-0f4c7eacf9a8",
  "UniEstate Properties": "6ae7c5d4-4d7b-43a1-ab71-dabc9fa5963e",
  "Oro 24": "bf61da2c-72c5-49ca-b6d1-527a85b96ad7",
  "C Fourteen": "ca1efbe3-35af-4c97-a394-a3b135480cd3",
  "The First Group": "5467d25b-e3a7-486a-9114-b9650edf015a",
  "The Developer Properties": "bec5ad73-37c2-4261-8644-c88960e28851",
  "SOL Properties (managed by You&Co)": "48a244a5-1d36-4b8a-adc4-438f6b8fb379",
  "Tebyan Real Estate Development Enterprises": "19ae94ea-c1d6-4e2f-b034-c2ddab050e8d",
  "Ithra Dubai": "13b2585a-e798-499a-8491-1d872be84fd3",
  "Bonyan International Investment Group": "36fe6b2e-b16c-4862-a378-4404b41ee4e4",
  "Alta Real Estate Development": "d1cac9d6-eb01-4e78-a979-ec0c1cec9cce",
  "Green Yard Properties Development": "c5546232-ee5e-4773-b684-7038d458aea9",
  "Gemini Property Developers": "a69dd7b4-c53e-45f5-bbcf-18fcfcd3224c",
  "Five Holdings": "42068ab4-2fc1-4952-ac34-4fe94afa1a5e",
  "Escan Real Estate": "7ad62765-b62c-4864-be34-82657a2296b2",
  "Triplanet Range Developements": "063b226d-d22d-42f9-ae68-8e2a9853071b",
  "Dar Al Arkan Properties": "1d5ed922-22d9-4130-9949-d778e4508046",
  "Emirates National Investment": "74e66e38-5115-49b0-b9e5-8c3020576802",
  "Bloom Heights Properties L.L.C": "9d116d93-4c8c-4c01-82cc-6fc2309c1017",
  "Myra Properties": "60839a3c-88de-449c-b4a1-6c6cf83fe824",
  "Aces Property Development L.L.C": "e501338b-bfd3-455b-a74f-c7a8512af7a5",
  "CDS Developments": "0c5d100e-e84b-4035-820a-a8898d1140d2",
  "Bold Living": "2f33eb22-edaf-4576-a551-12ce9f237ef7",
  "WELL Concept RED": "ee2b442c-0273-42de-bbb4-9895724e9d6e"
};

async function importDevelopers() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const developerRepository = AppDataSource.getRepository(Developer);
    
    const developers = Object.entries(developersData).map(([name, id]) => ({
      id,
      name: name.trim(),
    }));

    console.log(`📊 Importing ${developers.length} developers...`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const dev of developers) {
      try {
        // Check if developer already exists
        const existing = await developerRepository.findOne({ where: { id: dev.id } });
        if (existing) {
          // Update if exists
          existing.name = dev.name;
          await developerRepository.save(existing);
          console.log(`✓ Updated: ${dev.name}`);
        } else {
          // Create new
          await developerRepository.save(dev);
          console.log(`✓ Created: ${dev.name}`);
        }
        successCount++;
      } catch (error: any) {
        errorCount++;
        const errorMsg = `Failed to import "${dev.name}": ${error.message}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    const finalCount = await developerRepository.count();
    console.log(`\n📈 Total developers in database: ${finalCount}`);

    await AppDataSource.destroy();
    console.log('✅ Done');
  } catch (error: any) {
    console.error('❌ Error importing developers:', error);
    process.exit(1);
  }
}

importDevelopers();

