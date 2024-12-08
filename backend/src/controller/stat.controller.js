import { Album } from "../models/album.model.js";
import { Song } from "../models/song.model.js";
import { User } from "../models/user.model.js";


export const getStats = async (req, res, next) => {
	try {
		const [totalSongs, totalAlbums, totalUsers, uniqueArtists] = await Promise.all([
			Song.countDocuments(),
			Album.countDocuments(),
			User.countDocuments(),

			Song.aggregate([
				{
					$unionWith: { // it merges song and albums
						coll: "albums",
						pipeline: [],
					},
				},
				{
					$group: {
						_id: "$artist",
					},
				},
				{
					$count: "count",
				},
			]),
		]);

		
		res.status(200).json({
			totalAlbums,
			totalSongs,
			totalUsers,
			totalArtists: uniqueArtists[0]?.count || 0,
		});
	} catch (error) {
		next(error);
	}
};



// $unionWith:
// Merges the songs and albums collections into a single stream.
// coll: "albums": Specifies the albums collection to combine with songs.
// pipeline: []: Indicates no transformations are applied to the albums data.
// $group:
// Groups the merged documents by the artist field (_id is set to $artist).
// This step identifies unique artists across both collections.
// $count:
// Counts the number of unique groups (i.e., unique artists).